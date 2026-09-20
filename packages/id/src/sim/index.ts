import type { ValidationResult } from "@id-validator/core";
import { CoreErrorCode, makeError, digitsOnly, ensureValidInput } from "@id-validator/core";

/**
 * SIM (Surat Izin Mengemudi) number formats are not published in a single
 * consolidated public spec and vary by issuing Polda/era. This is a
 * heuristic length check only (PRD §10 allows shipping a "heuristic" status
 * when no reliable checksum/structure exists), covering the commonly cited
 * 12-digit legacy number. It does NOT confirm the SIM was actually issued.
 */
function validate(input: unknown): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  const digits = digitsOnly(safeInput.trim());
  
  // Check for empty or whitespace-only input after normalization
  if (!digits) {
    return { valid: false, errors: [makeError(CoreErrorCode.REQUIRED, "SIM number is required.")] };
  }
  if (digits.length !== 12) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.INVALID_LENGTH, "SIM number must be 12 digits (heuristic).")],
    };
  }

  return { valid: true, errors: [], value: digits };
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

export const sim = { validate, isValid };
