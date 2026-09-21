import type { ValidationError, ValidationResult } from "@idvalidator/core";
import { CoreErrorCode, makeError, ensureValidInput } from "@idvalidator/core";

export interface ParsedLicensePlate {
  regionCode: string;
  number: string;
  seriesCode: string;
}

// Indonesian plates: 1-2 letter region code, 1-4 digit number (no leading
// zero), optional 0-3 letter series/sub-area suffix.
const PLATE_PATTERN = /^([A-Z]{1,2})\s*([1-9]\d{0,3})\s*([A-Z]{0,3})$/;

function normalize(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Structural check only — matches the known region/number/series pattern.
 * Does not confirm the plate is currently issued or registered (PRD §14).
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
    return { valid: false, errors: [makeError(CoreErrorCode.REQUIRED, "License plate is required.")] };
  }
  
  const errors: ValidationError[] = [];

  if (!PLATE_PATTERN.test(normalized)) {
    errors.push(makeError(CoreErrorCode.INVALID_FORMAT, "License plate does not match the known Indonesian plate pattern."));
    return { valid: false, errors };
  }

  return { valid: true, errors: [], value: normalized };
}

function parse(input: string): ParsedLicensePlate {
  const result = validate(input);
  if (!result.valid || !result.value) {
    throw new Error("Cannot parse an invalid license plate.");
  }

  const match = PLATE_PATTERN.exec(result.value);
  if (!match) {
    throw new Error("Cannot parse an invalid license plate.");
  }

  return {
    regionCode: match[1],
    number: match[2],
    seriesCode: match[3],
  };
}

function format(input: string): string {
  const { regionCode, number, seriesCode } = parse(input);
  return [regionCode, number, seriesCode].filter(Boolean).join(" ");
}

/**
 * Convenience wrapper that returns true if the input is valid, false otherwise.
 * Use validate() if you need error details.
 */
function isValid(input: unknown): boolean {
  return validate(input).valid;
}

export const licensePlate = { validate, normalize, parse, format, isValid };
