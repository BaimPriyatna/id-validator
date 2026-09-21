import type { ValidationError, ValidationResult, ValidationOptions } from "@idvalidator/core";
import { CoreErrorCode, makeErrorWithOverride, digitsOnly, ensureValidInput, hasNonAscii } from "@idvalidator/core";
import regionsData from "../../data/regions.json";

export interface ParsedNik {
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  /** ISO 8601 date (YYYY-MM-DD). Century is inferred — see format() docs below. */
  birthDate: string;
  gender: "male" | "female";
  sequence: string;
}

const NIK_LENGTH = 16;

// Real province/regency codes (Kepmendagri No. 300.2.2-2430/2025, see
// data/regions.json for source+version). District (kecamatan) codes are
// NOT covered by this dataset — validating those stays a "not 00" heuristic
// until a kecamatan-level reference dataset is added (PRD §16).
const PROVINCE_CODES = new Set(regionsData.provinces.map((p) => p.code));
const REGENCY_KEYS = new Set(regionsData.regencies.map((r) => `${r.provinceCode}:${r.code}`));

function normalize(input: string): string {
  return digitsOnly(input.trim());
}

/**
 * NIK structure (16 digits): PP KK CC DDMMYY SSSS
 * - PP/KK/CC: province / regency-city / district administrative codes
 * - DD: day of birth; females are encoded as DD + 40
 * - MM/YY: month and two-digit year of birth
 * - SSSS: sequence number issued that day in that district (non-zero)
 *
 * This checks structural well-formedness only — it does not confirm the
 * NIK is registered with Dukcapil (PRD §11).
 * 
 * @param options - Optional validation options including custom error messages
 */
function validate(input: unknown, options?: ValidationOptions): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  const trimmed = safeInput.trim();

  // Reject emoji or non-ASCII — these must be caught before digitsOnly strips
  // them, otherwise a valid-length digit string could emerge by accident.
  if (hasNonAscii(trimmed)) {
    return {
      valid: false,
      errors: [makeErrorWithOverride(CoreErrorCode.INVALID_FORMAT, "NIK must contain digits only.", options)],
    };
  }

  // Detect non-digit characters (e.g. letters like 'A') BEFORE stripping them.
  // If the trimmed input contains any non-digit, it's a format error — not a
  // length error (which would be reported if we stripped first).
  if (/[^\d\s]/.test(trimmed)) {
    return {
      valid: false,
      errors: [makeErrorWithOverride(CoreErrorCode.INVALID_FORMAT, "NIK must contain digits only.", options)],
    };
  }

  const normalized = digitsOnly(trimmed);
  
  // Check for empty or whitespace-only input after normalization
  if (!normalized) {
    return { 
      valid: false, 
      errors: [makeErrorWithOverride(CoreErrorCode.REQUIRED, "NIK is required.", options)] 
    };
  }
  
  const errors: ValidationError[] = [];

  if (normalized.length !== NIK_LENGTH) {
    errors.push(
      makeErrorWithOverride(CoreErrorCode.INVALID_LENGTH, `NIK must be ${NIK_LENGTH} digits.`, options)
    );
    return { valid: false, errors };
  }

  const provinceCode = normalized.slice(0, 2);
  const regencyCode = normalized.slice(2, 4);
  const districtCode = normalized.slice(4, 6);
  const day = Number(normalized.slice(6, 8));
  const month = Number(normalized.slice(8, 10));
  const sequence = normalized.slice(12, 16);

  if (!PROVINCE_CODES.has(provinceCode)) {
    errors.push(
      makeErrorWithOverride(
        "INVALID_REGION_CODE", 
        `Province code ${provinceCode} is not a recognized Kemendagri code.`,
        options
      )
    );
  } else if (!REGENCY_KEYS.has(`${provinceCode}:${regencyCode}`)) {
    errors.push(
      makeErrorWithOverride(
        "INVALID_REGION_CODE", 
        `Regency/city code ${regencyCode} is not recognized for province ${provinceCode}.`,
        options
      )
    );
  }
  // District-level reference data is not available yet — heuristic only.
  if (districtCode === "00") {
    errors.push(
      makeErrorWithOverride("INVALID_REGION_CODE", "District code cannot be 00.", options)
    );
  }

  const dayOfMonth = day > 40 ? day - 40 : day;
  if (dayOfMonth < 1 || dayOfMonth > 31) {
    errors.push(
      makeErrorWithOverride("INVALID_DATE", "Day-of-birth component is out of range.", options)
    );
  }
  if (month < 1 || month > 12) {
    errors.push(
      makeErrorWithOverride("INVALID_DATE", "Month-of-birth component is out of range.", options)
    );
  }
  if (sequence === "0000") {
    errors.push(
      makeErrorWithOverride("INVALID_SEQUENCE", "Sequence number cannot be 0000.", options)
    );
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], value: normalized };
}

function resolveYear(twoDigitYear: number): number {
  // No century marker exists in the NIK itself. Heuristic: years greater
  // than the current two-digit year are assumed 1900s, otherwise 2000s.
  // This is a known limitation (PRD §21) — a NIK for someone born in early
  // 1900s vs the equivalent 2000s year cannot be distinguished here.
  const currentTwoDigitYear = new Date().getFullYear() % 100;
  return twoDigitYear > currentTwoDigitYear ? 1900 + twoDigitYear : 2000 + twoDigitYear;
}

function parse(input: string): ParsedNik {
  const result = validate(input);
  if (!result.valid || !result.value) {
    throw new Error("Cannot parse an invalid NIK.");
  }

  const normalized = result.value;
  const day = Number(normalized.slice(6, 8));
  const month = Number(normalized.slice(8, 10));
  const twoDigitYear = Number(normalized.slice(10, 12));

  const gender: ParsedNik["gender"] = day > 40 ? "female" : "male";
  const dayOfMonth = day > 40 ? day - 40 : day;
  const year = resolveYear(twoDigitYear);
  const birthDate = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${dayOfMonth
    .toString()
    .padStart(2, "0")}`;

  return {
    provinceCode: normalized.slice(0, 2),
    regencyCode: normalized.slice(2, 4),
    districtCode: normalized.slice(4, 6),
    birthDate,
    gender,
    sequence: normalized.slice(12, 16),
  };
}

/**
 * NIK has no official grouped display format — it is issued and shown as a
 * plain 16-digit string. format() returns the normalized digits.
 */
function format(input: string): string {
  const result = validate(input);
  if (!result.valid || !result.value) {
    throw new Error("Cannot format an invalid NIK.");
  }
  return result.value;
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

export const nik = { validate, normalize, parse, format, isValid };
