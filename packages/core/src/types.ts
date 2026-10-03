export interface ValidationError {
  code: string;
  message: string;
}

/**
 * How much a validator actually proved, from strongest to weakest.
 *
 * "cryptographic"  A mathematical check digit was verified. Detects
 *                  single-digit transcription errors with certainty.
 * "registry"       Checked against an official reference dataset (ISO/SWIFT/
 *                  Kemendagri). Catches values that could not exist, but says
 *                  nothing about whether they are in use.
 * "structural"     Format, length and pattern only. Rules out malformed input;
 *                  does not rule out a well-formed value that was never issued.
 * "heuristic"      A length/shape check with no reference data at all. Any value
 *                  matching the shape passes -- treat "valid" here as "plausible
 *                  format", nothing more.
 *
 * This is a property of the validator, not of the input: one validator has one
 * level, so consumers can compare validators without reading their source.
 */
export type ValidationConfidence = "cryptographic" | "registry" | "structural" | "heuristic";

export interface ValidationResult<T = unknown> {
  valid: boolean;
  errors: ValidationError[];
  value?: T;
  /**
   * What the validator actually proved about a VALID result. Absent on invalid
   * results, where it would be meaningless.
   */
  confidence?: ValidationConfidence;
}

export interface ValidationOptions {
  /**
   * Custom error messages to override default messages.
   * Map error codes to custom message strings.
   * 
   * Resolution order:
   * 1. Per-call custom message (if provided)
   * 2. Built-in default message
   */
  messages?: Record<string, string>;
}

export interface ReferenceDataMeta {
  source: string;
  version: string;
  updatedAt: string;
}
