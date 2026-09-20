import type { ValidationResult, ValidationOptions } from "@id-validator/core";
import { CoreErrorCode, makeErrorWithOverride, ensureValidInput, hasNonAscii } from "@id-validator/core";

export interface ParsedEmail {
  localPart: string;
  domain: string;
}

// Practical structural check (not full RFC 5322 — that grammar is far
// looser than what any real mail provider accepts). Covers the common
// local-part/domain shape and rejects the obvious malformed cases.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(input: string): string {
  // Domains are case-insensitive; local-parts are technically
  // case-sensitive per spec but almost never treated that way in
  // practice. Lowercasing the whole address is the pragmatic default.
  return input.trim().toLowerCase();
}

function validate(input: unknown, options?: ValidationOptions): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  // Reject input containing emoji or non-ASCII characters (codepoint > 127).
  // These are structurally invalid for any email address and would otherwise
  // be silently dropped by normalize(), giving a false valid result.
  if (hasNonAscii(safeInput)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(
          CoreErrorCode.INVALID_FORMAT,
          "Email must contain ASCII characters only.",
          options
        )
      ],
    };
  }

  const normalized = normalize(safeInput);
  
  // Check for empty or whitespace-only input after normalization
  if (!normalized) {
    return { 
      valid: false, 
      errors: [makeErrorWithOverride(CoreErrorCode.REQUIRED, "Email is required.", options)] 
    };
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return {
      valid: false,
      errors: [
        makeErrorWithOverride(
          CoreErrorCode.INVALID_FORMAT, 
          "Email does not match the expected local@domain.tld shape.",
          options
        )
      ],
    };
  }

  return { valid: true, errors: [], value: normalized };
}

function parse(input: string): ParsedEmail {
  const result = validate(input);
  if (!result.valid || !result.value) {
    throw new Error("Cannot parse an invalid email.");
  }

  const at = result.value.lastIndexOf("@");
  return {
    localPart: result.value.slice(0, at),
    domain: result.value.slice(at + 1),
  };
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

// Library never claims a mailbox exists or accepts mail — only that the
// address is structurally well-formed (mirrors phone's scope, PRD §9).
export const email = { validate, normalize, parse, isValid };
