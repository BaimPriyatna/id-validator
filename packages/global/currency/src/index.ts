import type { ValidationResult, ValidationOptions, ReferenceDataMeta } from "@idvalidator/core";
import { CoreErrorCode, makeErrorWithOverride, ensureValidInput, hasNonAscii } from "@idvalidator/core";
import iso4217 from "../data/iso4217.json";

export interface Currency {
  /** ISO 4217 alphabetic code. */
  code: string;
  name: string;
  /** ISO 4217 numeric code, zero-padded to three digits (e.g. "048" for BHD). */
  numeric: string;
  /**
   * Decimal places in the minor unit. `null` where the standard defines none
   * (precious metals, XDR, XXX) -- such codes must never be used in amount
   * arithmetic, and the conversion helpers reject them.
   */
  minorUnits: number | null;
  /** ISO 4217 units of account / fund codes, which are not circulating tender. */
  isFund: boolean;
  /** Every territory the standard assigns this code to (EUR has 37). */
  countries: string[];
}

export interface Iso4217Meta extends ReferenceDataMeta {
  note: string;
}

export type CurrencyCode = string;

const BY_CODE = new Map<string, Currency>();
const BY_NUMERIC = new Map<string, Currency>();
for (const c of iso4217.currencies as Currency[]) {
  BY_CODE.set(c.code, c);
  BY_NUMERIC.set(c.numeric, c);
}

/** Registry metadata and provenance for the bundled list. */
export const registryMeta: Iso4217Meta = iso4217.meta as unknown as Iso4217Meta;

const CODE_PATTERN = /^[A-Z]{3}$/;

/**
 * Codes are canonically uppercase A-Z. Anything else -- wrong length, digits,
 * a country code, "US$" -- is reported as unknown rather than guessed at.
 */
function normalize(input: string): string {
  return input.trim().toUpperCase();
}

function validate(input: unknown, options?: ValidationOptions): ValidationResult<string> {
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") return safeInput;

  if (hasNonAscii(safeInput)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(CoreErrorCode.INVALID_FORMAT, "Currency code must contain ASCII characters only.", options),
      ],
    };
  }

  const normalized = normalize(safeInput);
  if (!normalized) {
    return {
      valid: false,
      errors: [makeErrorWithOverride(CoreErrorCode.REQUIRED, "Currency code is required.", options)],
    };
  }

  if (!CODE_PATTERN.test(normalized)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(
          CoreErrorCode.INVALID_FORMAT,
          "Currency code must be three letters (ISO 4217 alphabetic code, e.g. USD).",
          options,
        ),
      ],
    };
  }

  if (!BY_CODE.has(normalized)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride("UNKNOWN_CURRENCY", `"${normalized}" is not a current ISO 4217 currency code.`, options),
      ],
    };
  }

  return { valid: true, errors: [], value: normalized };
}

function isValid(input: unknown, options?: ValidationOptions): boolean {
  return validate(input, options).valid;
}

function info(input: string): Currency | null {
  return BY_CODE.get(normalize(input)) ?? null;
}

/** Look up by the three-digit ISO 4217 numeric code used in ISO 8583 DE49 and card data. */
function infoByNumeric(input: string | number): Currency | null {
  const padded = typeof input === "number" ? String(input).padStart(3, "0") : input.trim();
  return BY_NUMERIC.get(padded) ?? null;
}

function listCurrencies(): Currency[] {
  return iso4217.currencies as Currency[];
}

/**
 * Number of decimal places in the currency's minor unit, or null when the
 * standard defines none (XAU, XDR, XXX...). Returns undefined for an unknown
 * code -- distinguish "no minor unit" (null) from "not a currency" (undefined).
 */
function minorUnits(input: string): number | null | undefined {
  return info(input)?.minorUnits;
}

/** True for ISO 4217 units of account / fund codes, which are not circulating tender. */
function isFundCode(input: string): boolean {
  return info(input)?.isFund ?? false;
}

/**
 * Major units -> minor units, e.g. USD 1.23 -> 123, JPY 1000 -> 1000,
 * KWD 1.234 -> 1234.
 *
 * Throws on a non-finite amount, on a code with no defined minor unit, and on
 * an amount with more decimals than the currency allows (USD 1.234) rather
 * than silently rounding -- that rounding is the bug this package exists to
 * prevent.
 */
function toMinorUnits(amount: number, code: string): number {
  const currency = info(code);
  if (!currency) throw new Error(`Unknown currency code: "${code}".`);
  if (currency.minorUnits === null) {
    throw new Error(`Currency ${currency.code} has no defined minor unit and cannot be used in amount arithmetic.`);
  }
  if (!Number.isFinite(amount)) throw new Error("Amount must be a finite number.");

  const scale = 10 ** currency.minorUnits;
  const scaled = amount * scale;
  // Round to the currency's own precision to absorb float representation error
  // (0.1 * 100 === 10.000000000000002), then reject anything that actually
  // carried excess precision.
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-6) {
    throw new Error(
      `Amount has more than ${currency.minorUnits} decimal place(s), which ${currency.code} does not use.`,
    );
  }
  return rounded;
}

/**
 * Minor units -> major units, the inverse of toMinorUnits(): USD 123 -> 1.23,
 * JPY 1000 -> 1000, KWD 1234 -> 1.234.
 */
function fromMinorUnits(amount: number, code: string): number {
  const currency = info(code);
  if (!currency) throw new Error(`Unknown currency code: "${code}".`);
  if (currency.minorUnits === null) {
    throw new Error(`Currency ${currency.code} has no defined minor unit and cannot be used in amount arithmetic.`);
  }
  if (!Number.isFinite(amount)) throw new Error("Amount must be a finite number.");
  if (!Number.isInteger(amount)) {
    throw new Error("Minor-unit amount must be an integer (e.g. 1230 for 12.30 USD, not 12.3).");
  }
  return amount / 10 ** currency.minorUnits;
}

/**
 * ISO 4217 explicitly does NOT assign a minor unit to precious metals, XDR,
 * XXX and similar codes. Their numeric value is not defined by the standard, so
 * this returns null rather than guessing a precision.
 */
function hasMinorUnits(input: string): boolean | null {
  const currency = info(input);
  if (!currency) return null;
  return currency.minorUnits !== null;
}

// This package carries ISO 4217 reference metadata only. It never bundles or
// implies exchange rates, and a valid code says nothing about whether a
// currency is legal tender anywhere, or what it is worth.
export const currency = {
  validate,
  normalize,
  isValid,
  info,
  infoByNumeric,
  listCurrencies,
  minorUnits,
  hasMinorUnits,
  isFundCode,
  toMinorUnits,
  fromMinorUnits,
  registryMeta,
};
