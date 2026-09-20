// Shared normalization primitives reused across validators/countries.
export function stripWhitespace(input: string): string {
  return input.replace(/\s+/g, "");
}

export function stripSeparators(input: string, separators: RegExp = /[-./]/g): string {
  return input.replace(separators, "");
}

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}
