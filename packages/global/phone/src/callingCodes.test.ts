import { describe, expect, it } from "vitest";
import { matchCallingCode } from "./callingCodes.js";

describe("matchCallingCode", () => {
  it("matches a known 2-digit calling code", () => {
    expect(matchCallingCode("628123456789")).toBe("62");
  });

  it("matches a known 1-digit calling code (NANP)", () => {
    expect(matchCallingCode("12025551234")).toBe("1");
  });

  it("returns null when no calling code matches the prefix", () => {
    expect(matchCallingCode("999123456")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(matchCallingCode("")).toBeNull();
  });
});
