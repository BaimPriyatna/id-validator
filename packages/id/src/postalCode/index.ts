import type { ValidationResult } from "@id-validator/core";
import { CoreErrorCode, makeError, digitsOnly, ensureValidInput } from "@id-validator/core";

const POSTAL_CODE_LENGTH = 5;

function normalize(input: string): string {
  return digitsOnly(input.trim());
}

/**
 * Indonesian postal codes are 5-digit, non-algorithmic identifiers assigned
 * per kelurahan/desa by Pos Indonesia (no checksum). Structurally, no
 * assigned code starts with "0". This checks structural well-formedness
 * only, not that the code is currently assigned to a real location.
 */
function validate(input: unknown): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  const normalized = normalize(safeInput);
  
  // Check for empty or whitespace-only input after normalization
  if (!normalized) {
    return { valid: false, errors: [makeError(CoreErrorCode.REQUIRED, "Postal code is required.")] };
  }

  if (normalized.length !== POSTAL_CODE_LENGTH || !/^\d{5}$/.test(normalized)) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.INVALID_LENGTH, `Postal code must be ${POSTAL_CODE_LENGTH} digits.`)],
    };
  }

  if (normalized[0] === "0") {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.INVALID_FORMAT, "Postal code cannot start with 0.")],
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

// parse()/format() are intentionally NOT exposed yet: resolving a code to
// province/city/district requires the reference dataset (data/postal-codes.json),
// which is still an empty placeholder (PRD §13, §16). Exposing a decomposition
// API before that data exists would mean either guessing ranges or a hidden
// "reference data not available" failure on every call — both are worse than
// omitting the operation until it can be backed by real data.
export const postalCode = { validate, normalize, isValid };
