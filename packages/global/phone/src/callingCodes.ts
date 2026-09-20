// Bundled at build time (tsup/esbuild) so no runtime JSON import-assertion is needed.
import callingCodesData from "../data/calling-codes.json";

// Sorted longest-first so parse() matches the most specific calling code
// (e.g. "62" before "6") instead of the shortest prefix.
const CALLING_CODES: string[] = [...callingCodesData.codes].sort((a, b) => b.length - a.length);

export function matchCallingCode(digits: string): string | null {
  for (const code of CALLING_CODES) {
    if (digits.startsWith(code)) return code;
  }
  return null;
}
