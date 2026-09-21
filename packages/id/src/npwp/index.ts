import type { ValidationError, ValidationResult } from "@idvalidator/core";
import { CoreErrorCode, makeError, digitsOnly, ensureValidInput } from "@idvalidator/core";
import { nik } from "../nik/index.js";

export interface ParsedNpwp {
  format: "legacy-15" | "nik-16";
  /** 9-digit unique taxpayer number (legacy format only). */
  uniqueNumber?: string;
  /** Kantor Pelayanan Pajak code (legacy format only). */
  kppCode?: string;
  /** "000" for pusat, otherwise a branch/cabang code (legacy format only). */
  branchCode?: string;
}

const LEGACY_LENGTH = 15;
const NIK_BASED_LENGTH = 16;

// Weighted mod-11 checksum commonly used to validate the 9th (check) digit
// of the legacy 15-digit NPWP. This algorithm is not officially published
// by DJP, so treat matches as a heuristic signal, not proof of a real
// taxpayer number (PRD §10, §12 — "heuristic" status).
const CHECKSUM_WEIGHTS = [2, 4, 8, 5, 10, 9, 7, 3];

function normalize(input: string): string {
  return digitsOnly(input.trim());
}

function checksumIsValid(digits9: string): boolean {
  const sum = CHECKSUM_WEIGHTS.reduce((acc, weight, i) => acc + Number(digits9[i]) * weight, 0);
  const remainder = sum % 11;
  const expected = remainder < 2 ? remainder : 11 - remainder;
  return expected === Number(digits9[8]);
}

function validateLegacy(digits: string): ValidationResult<string> {
  const errors: ValidationError[] = [];

  if (!checksumIsValid(digits.slice(0, 9))) {
    errors.push(makeError("INVALID_CHECKSUM", "NPWP check digit does not match (heuristic algorithm)."));
  }
  if (digits.slice(0, 2) === "00") {
    errors.push(makeError(CoreErrorCode.INVALID_FORMAT, "NPWP unique-number prefix cannot be 00."));
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], value: digits };
}

/**
 * Since 2024, individual taxpayers' NPWP is unified with their 16-digit
 * NIK (PMK 112/2022). This path is structural-only, delegated to nik.validate,
 * and cannot distinguish "valid NIK" from "valid NIK actually used as an
 * active NPWP" — that requires DJP verification, out of scope (PRD §4.3).
 */
function validateNikBased(digits: string): ValidationResult<string> {
  const result = nik.validate(digits);
  if (!result.valid) {
    return {
      valid: false,
      errors: result.errors.map((e: ValidationError) => makeError(e.code, `NIK-based NPWP: ${e.message}`)),
    };
  }
  return { valid: true, errors: [], value: digits };
}

function validate(input: unknown): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  const digits = normalize(safeInput);
  
  // Check for empty or whitespace-only input after normalization
  if (!digits) {
    return { valid: false, errors: [makeError(CoreErrorCode.REQUIRED, "NPWP is required.")] };
  }

  if (digits.length === NIK_BASED_LENGTH) return validateNikBased(digits);
  if (digits.length === LEGACY_LENGTH) return validateLegacy(digits);

  return {
    valid: false,
    errors: [
      makeError(
        CoreErrorCode.INVALID_LENGTH,
        `NPWP must be ${LEGACY_LENGTH} digits (legacy) or ${NIK_BASED_LENGTH} digits (NIK-based).`,
      ),
    ],
  };
}

function parse(input: string): ParsedNpwp {
  const result = validate(input);
  if (!result.valid || !result.value) {
    throw new Error("Cannot parse an invalid NPWP.");
  }

  const digits = result.value;
  if (digits.length === NIK_BASED_LENGTH) {
    return { format: "nik-16" };
  }

  return {
    format: "legacy-15",
    uniqueNumber: digits.slice(0, 9),
    kppCode: digits.slice(9, 12),
    branchCode: digits.slice(12, 15),
  };
}

function format(input: string): string {
  const parsed = parse(input);
  const result = validate(input);
  const digits = result.value as string;

  if (parsed.format === "nik-16") return digits;

  // Standard legacy display: XX.XXX.XXX.X-XXX.XXX
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(
    9,
    12,
  )}.${digits.slice(12, 15)}`;
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

export const npwp = { validate, normalize, parse, format, isValid };
