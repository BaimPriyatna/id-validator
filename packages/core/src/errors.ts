import type { ValidationError, ValidationOptions } from "./types.js";

// Central place for shared error codes so country packages stay consistent
// with each other instead of inventing ad-hoc strings.
export const CoreErrorCode = {
  REQUIRED: "REQUIRED",
  INVALID_TYPE: "INVALID_TYPE",
  INVALID_LENGTH: "INVALID_LENGTH",
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_CHECKSUM: "INVALID_CHECKSUM",
} as const;

export function makeError(code: string, message: string): ValidationError {
  return { code, message };
}

/**
 * Creates an error with optional message override from ValidationOptions.
 * If a custom message is provided for the error code, it's used instead of the default.
 */
export function makeErrorWithOverride(
  code: string,
  defaultMessage: string,
  options?: ValidationOptions
): ValidationError {
  const message = options?.messages?.[code] ?? defaultMessage;
  return { code, message };
}
