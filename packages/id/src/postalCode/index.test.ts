import { describe, expect, it } from "vitest";
import { postalCode } from "./index.js";

describe("postalCode.validate", () => {
  it("accepts a well-formed 5-digit code", () => {
    expect(postalCode.validate("40115").valid).toBe(true);
  });

  it("normalizes separators before validating", () => {
    expect(postalCode.validate(" 40 115 ").valid).toBe(true);
  });

  it("rejects wrong length", () => {
    const result = postalCode.validate("123");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
  });

  it("rejects a code starting with 0", () => {
    const result = postalCode.validate("01234");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("rejects empty input", () => {
    expect(postalCode.validate("").errors[0].code).toBe("REQUIRED");
  });
});

describe("postalCode.validate - input safety", () => {
  it("rejects null", () => {
    const result = postalCode.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = postalCode.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = postalCode.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = postalCode.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = postalCode.validate(12345);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects boolean type", () => {
    const result = postalCode.validate(true);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects object type", () => {
    const result = postalCode.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects array type", () => {
    const result = postalCode.validate([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects excessively long input", () => {
    const longInput = "1".repeat(1001);
    const result = postalCode.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("postalCode.isValid - convenience wrapper", () => {
  it("returns true for valid postal code", () => {
    expect(postalCode.isValid("12345")).toBe(true);
    expect(postalCode.isValid("40123")).toBe(true);
  });

  it("returns false for invalid postal code", () => {
    expect(postalCode.isValid("01234")).toBe(false); // starts with 0
    expect(postalCode.isValid("123")).toBe(false); // too short
    expect(postalCode.isValid("123456")).toBe(false); // too long
  });

  it("returns false for invalid input types", () => {
    expect(postalCode.isValid(null)).toBe(false);
    expect(postalCode.isValid(undefined)).toBe(false);
    expect(postalCode.isValid(12345)).toBe(false);
  });
});
