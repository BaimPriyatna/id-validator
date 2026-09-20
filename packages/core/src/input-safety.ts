import type { ValidationResult } from "./types.js";
import { CoreErrorCode, makeError } from "./errors.js";

/**
 * Maximum reasonable input length to prevent resource exhaustion attacks.
 * No legitimate ID should exceed 1000 characters even with separators.
 */
export const MAX_INPUT_LENGTH = 1000;

/**
 * Validates input type and returns a safe string or a validation error result.
 * Guards against TypeError from malformed consumer input.
 * 
 * @returns The input as a string if valid, or a ValidationResult with errors
 */
export function ensureValidInput(input: unknown): string | ValidationResult<never> {
  // Handle null/undefined
  if (input == null) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.REQUIRED, "Input is required.")],
    };
  }

  // Handle non-string types
  if (typeof input !== "string") {
    return {
      valid: false,
      errors: [
        makeError(
          CoreErrorCode.INVALID_TYPE,
          `Input must be a string, received ${typeof input}.`
        ),
      ],
    };
  }

  // Handle excessively long input (potential DoS)
  if (input.length > MAX_INPUT_LENGTH) {
    return {
      valid: false,
      errors: [
        makeError(
          CoreErrorCode.INVALID_LENGTH,
          `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`
        ),
      ],
    };
  }

  return input;
}

/**
 * Checks if input contains only ASCII digits and common separators.
 * Rejects emoji, non-ASCII characters, and unusual Unicode.
 */
export function hasOnlyExpectedCharacters(
  input: string,
  allowedPattern: RegExp = /^[\d\s.\-/]+$/
): boolean {
  return allowedPattern.test(input);
}

/**
 * Returns true if the string contains any non-ASCII character
 * (codepoint > 127), including emoji, fullwidth, and other Unicode.
 * Use this as a fast pre-check before normalizing/stripping input.
 */
export function hasNonAscii(input: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(input);
}
