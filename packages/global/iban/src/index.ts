import type { ValidationResult, ValidationOptions, ReferenceDataMeta } from "@idvalidator/core";
import { CoreErrorCode, makeErrorWithOverride, ensureValidInput, hasNonAscii } from "@idvalidator/core";
import countryData from "../data/iban-countries.json";

export interface IbanCountry {
  code: string;
  name: string;
  length: number;
  sepa: boolean;
  example: string;
}

export interface IbanRegistryMeta extends ReferenceDataMeta {
  note: string;
}

export interface ParsedIban {
  countryCode: string;
  countryName: string;
  checkDigits: string;
  /**
   * Everything after the country code and check digits. Not decomposed
   * further: bank identifier / branch / account positions are country-specific
   * and are NOT modeled by this package.
   */
  bban: string;
  isSepa: boolean;
}

const OFFICIAL = new Map<string, IbanCountry>(
  countryData.countries.map((c) => [c.code, c as IbanCountry]),
);
const PARTIAL = new Map<string, IbanCountry>(
  countryData.partialCountries.map((c) => [c.code, c as IbanCountry]),
);

// ISO 13616: 2 alpha country code + 2 check digits + up to 30 alnum BBAN.
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;

/**
 * ISO 7064 mod-97-10. Remainder 1 means valid. Letters expand to two digits
 * (A=10 ... Z=35), so they must be accumulated with a *100 multiplier --
 * folding them in as a single value computes the wrong checksum for every
 * IBAN containing letters.
 */
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    if (ch >= "A" && ch <= "Z") {
      remainder = (remainder * 100 + (ch.charCodeAt(0) - 55)) % 97;
    } else {
      remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
    }
  }
  return remainder;
}

/**
 * Strips spaces and dashes, uppercases. IBANs are conventionally written in
 * groups of four ("DE89 3704 0044 0532 0130 00") but that grouping is purely
 * presentational, so it is not part of the canonical value.
 */
function normalize(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

function lookupCountry(code: string): { country: IbanCountry; partial: boolean } | null {
  const official = OFFICIAL.get(code);
  if (official) return { country: official, partial: false };
  const partial = PARTIAL.get(code);
  if (partial) return { country: partial, partial: true };
  return null;
}

export interface ValidateIbanOptions extends ValidationOptions {
  /**
   * Reject countries the registry lists as "Partial IBAN Countries
   * (Experimental)" (e.g. Morocco, Iran, Tunisia). Those are real entries in
   * the source but are not officially registered, so a strict consumer --
   * payment screening, say -- may want them rejected, while a consumer merely
   * checking whether a form input is plausible may not.
   * @default false
   */
  rejectPartialCountries?: boolean;
}

function validate(input: unknown, options?: ValidateIbanOptions): ValidationResult<string> {
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") return safeInput;

  // Reject emoji/non-ASCII up front: normalize() would otherwise fold them
  // away and we could report a spurious valid result for garbage input.
  if (hasNonAscii(safeInput)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(CoreErrorCode.INVALID_FORMAT, "IBAN must contain ASCII characters only.", options),
      ],
    };
  }

  const normalized = normalize(safeInput);
  if (!normalized) {
    return {
      valid: false,
      errors: [makeErrorWithOverride(CoreErrorCode.REQUIRED, "IBAN is required.", options)],
    };
  }

  if (!IBAN_PATTERN.test(normalized)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(
          CoreErrorCode.INVALID_FORMAT,
          "IBAN does not match the expected structure (2 letters, 2 check digits, then the account number).",
          options,
        ),
      ],
    };
  }

  const countryCode = normalized.slice(0, 2);
  const found = lookupCountry(countryCode);
  if (!found) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride("UNKNOWN_COUNTRY_CODE", `No known IBAN country code: "${countryCode}".`, options),
      ],
    };
  }

  if (found.partial && options?.rejectPartialCountries) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(
          "PARTIAL_COUNTRY",
          `IBAN country "${countryCode}" is an experimental/partial IBAN country in the registry.`,
          options,
        ),
      ],
    };
  }

  if (normalized.length !== found.country.length) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(
          CoreErrorCode.INVALID_LENGTH,
          `IBANs issued in ${found.country.code} are ${found.country.length} characters, but this one is ${normalized.length}.`,
          options,
        ),
      ],
    };
  }

  if (mod97(normalized) !== 1) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(CoreErrorCode.INVALID_CHECKSUM, "IBAN checksum (ISO 7064 mod-97-10) is invalid.", options),
      ],
    };
  }

  return { valid: true, errors: [], value: normalized, confidence: "cryptographic" };
}

function parse(input: string): ParsedIban {
  const result = validate(input);
  if (!result.valid || !result.value) throw new Error("Cannot parse an invalid IBAN.");

  const value = result.value;
  const code = value.slice(0, 2);
  const found = lookupCountry(code);
  // Unreachable: validate() already rejected an unknown country code. Asserted
  // rather than returning a half-parsed result with placeholder fields.
  if (!found) throw new Error("Cannot parse an invalid IBAN.");

  return {
    countryCode: code,
    countryName: found.country.name,
    checkDigits: value.slice(2, 4),
    bban: value.slice(4),
    isSepa: found.country.sepa,
  };
}

/** Canonical electronic form, no spaces. See formatDisplay() for the grouped form. */
function format(input: string): string {
  const result = validate(input);
  if (!result.valid || !result.value) throw new Error("Cannot format an invalid IBAN.");
  return result.value;
}

/** "DE89 3704 0044 0532 0130 00" -- the presentational grouping used on statements. */
function formatDisplay(input: string): string {
  return format(input).replace(/(.{4})(?=.)/g, "$1 ");
}

function isValid(input: unknown, options?: ValidateIbanOptions): boolean {
  return validate(input, options).valid;
}

/** Every country in the registry, official entries first. Does not indicate whether an IBAN is actually issued. */
function listCountries(): IbanCountry[] {
  return [...OFFICIAL.values(), ...PARTIAL.values()];
}

function countryInfo(code: string): IbanCountry | null {
  return lookupCountry(code.toUpperCase())?.country ?? null;
}

// This library never claims an account exists, is open, or is reachable -- only
// that the string is a structurally well-formed, checksum-correct IBAN whose
// country appears in the registry (mirrors phone/email scope, PRD section 9).
export const iban = {
  validate,
  normalize,
  parse,
  format,
  formatDisplay,
  isValid,
  listCountries,
  countryInfo,
};
