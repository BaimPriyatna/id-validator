import type { ValidationResult } from "@idvalidator/core";
import { CoreErrorCode, makeError, digitsOnly, ensureValidInput, hasNonAscii } from "@idvalidator/core";
import { matchCallingCode } from "./callingCodes.js";

export interface ParsedPhone {
  countryCallingCode: string;
  nationalNumber: string;
}

// E.164: max 15 digits total, no leading 0 in the digit string after "+".
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Strips everything except leading "+" and digits. Does NOT add a "+" or a
 * calling code — a bare national number (e.g. "0812...") normalizes to
 * digits only and stays structurally invalid until it carries a calling
 * code, since this module has no country context to assume one.
 */
function normalize(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = digitsOnly(trimmed);
  return hasPlus ? `+${digits}` : digits;
}

function validate(input: unknown): ValidationResult<string> {
  // Type guard: ensure input is a valid string
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }

  // Reject emoji or non-ASCII characters — they would otherwise be stripped
  // by digitsOnly/normalize, potentially yielding a spurious valid result.
  if (hasNonAscii(safeInput)) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.INVALID_FORMAT, "Phone number must contain ASCII characters only.")],
    };
  }

  const normalized = normalize(safeInput);
  
  // Check for empty or whitespace-only input after normalization
  if (!normalized) {
    return { valid: false, errors: [makeError(CoreErrorCode.REQUIRED, "Phone number is required.")] };
  }

  if (!normalized.startsWith("+")) {
    return {
      valid: false,
      errors: [
        makeError(
          "MISSING_CALLING_CODE",
          "Phone number must include a country calling code (e.g. +62...).",
        ),
      ],
    };
  }

  if (!E164_PATTERN.test(normalized)) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.INVALID_FORMAT, "Phone number does not match E.164 structure.")],
    };
  }

  const digits = normalized.slice(1);
  if (!matchCallingCode(digits)) {
    return {
      valid: false,
      errors: [makeError("UNKNOWN_CALLING_CODE", "No known country calling code matches this number.")],
    };
  }

  return { valid: true, errors: [], value: normalized };
}

function parse(input: string): ParsedPhone {
  const result = validate(input);
  if (!result.valid || !result.value) {
    throw new Error("Cannot parse an invalid phone number.");
  }

  const digits = result.value.slice(1);
  const countryCallingCode = matchCallingCode(digits);
  if (!countryCallingCode) {
    throw new Error("Cannot parse an invalid phone number.");
  }

  return {
    countryCallingCode,
    nationalNumber: digits.slice(countryCallingCode.length),
  };
}

function format(input: string): string {
  const { countryCallingCode, nationalNumber } = parse(input);
  return `+${countryCallingCode} ${nationalNumber}`;
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

// Library never claims a number is active, assigned, or reachable — only
// that it is structurally well-formed (PRD §9).
export const phone = { validate, normalize, parse, format, isValid };
