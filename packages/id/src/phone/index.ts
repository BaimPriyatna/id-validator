import type { ValidationResult } from "@id-validator/core";
import { ensureValidInput } from "@id-validator/core";
import { phone as globalPhone } from "@id-validator/global-phone";
import type { ParsedPhone } from "@id-validator/global-phone";

const ID_CALLING_CODE = "62";

/**
 * Indonesian-specific preprocessing before delegating to the global E.164
 * validator (PRD §4.2 — global validators stay generic, country packages
 * add locale conventions on top):
 * - "08xxx" (common local format) -> "+62xxx"
 * - "62xxx" / "62-xxx" (no leading +) -> "+62xxx"
 * - "+62xxx" already international -> passed through as-is
 * - separators (space, "-", ".", parens) are stripped in every case
 * Anything that doesn't match an Indonesian shape (e.g. already some other
 * country's "+1...") is left alone and handled by the global validator.
 */
function toInternational(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("0")) return `+${ID_CALLING_CODE}${digits.slice(1)}`;
  if (digits.startsWith(ID_CALLING_CODE)) return `+${digits}`;
  return digits;
}

function normalize(input: string): string {
  return globalPhone.normalize(toInternational(input));
}

function validate(input: unknown): ValidationResult<string> {
  // Same type/length guard as every other validator — this wrapper does
  // its own string preprocessing (toInternational) before delegating to
  // globalPhone.validate(), so it needs the same runtime safety globalPhone
  // itself applies internally; skipping it here would let a non-string
  // reach toInternational()'s .trim() call directly.
  const safeInput = ensureValidInput(input);
  if (typeof safeInput !== "string") {
    return safeInput;
  }
  return globalPhone.validate(toInternational(safeInput));
}

function parse(input: string): ParsedPhone {
  return globalPhone.parse(toInternational(input));
}

function format(input: string): string {
  return globalPhone.format(toInternational(input));
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

export const phone = { validate, normalize, parse, format, isValid };
