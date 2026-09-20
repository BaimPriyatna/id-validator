import type { ValidationResult } from "@id-validator/core";
import { CoreErrorCode, makeError, ensureValidInput } from "@id-validator/core";

/**
 * Indonesian e-passport numbers are commonly cited as 1 letter + 7 digits
 * (e.g. "C1234567"). No official structural spec is consolidated publicly,
 * so this is a heuristic pattern check (PRD §10), not confirmation the
 * passport was actually issued or is currently valid.
 */
const PASSPORT_PATTERN = /^[A-Z]\d{7}$/;

function normalize(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function validate(input: unknown): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  const normalized = normalize(safeInput);
  
  // Check for empty or whitespace-only input after normalization
  if (!normalized) {
    return { valid: false, errors: [makeError(CoreErrorCode.REQUIRED, "Passport number is required.")] };
  }
  if (!PASSPORT_PATTERN.test(normalized)) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.INVALID_FORMAT, "Passport number must be 1 letter + 7 digits (heuristic).")],
    };
  }

  return { valid: true, errors: [], value: normalized };
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

export const passport = { validate, normalize, isValid };
