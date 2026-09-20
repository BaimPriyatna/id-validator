export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  errors: ValidationError[];
  value?: T;
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
