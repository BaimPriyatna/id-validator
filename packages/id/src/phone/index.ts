import type { ValidationResult } from "@id-validator/core";
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

function validate(input: string): ValidationResult<string> {
  return globalPhone.validate(toInternational(input));
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
  if (typeof input !== "string") return false;
  return globalPhone.validate(toInternational(input)).valid;
}

export const phone = { validate, normalize, parse, format, isValid };
