import { describe, expect, it } from "vitest";
import { passport } from "./index.js";

describe("passport.validate", () => {
  it("accepts 1 letter + 7 digits", () => {
    expect(passport.validate("C1234567").valid).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(passport.validate("c1234567").valid).toBe(true);
  });

  it("rejects 2 letters + digits", () => {
    expect(passport.validate("CC123456").valid).toBe(false);
  });

  it("rejects empty input", () => {
    expect(passport.validate("").errors[0].code).toBe("REQUIRED");
  });
});

describe("passport.validate - input safety", () => {
  it("rejects null", () => {
    const result = passport.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = passport.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = passport.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = passport.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = passport.validate(12345678);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects boolean type", () => {
    const result = passport.validate(true);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects object type", () => {
    const result = passport.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects array type", () => {
    const result = passport.validate([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects excessively long input", () => {
    const longInput = "C" + "1".repeat(1000);
    const result = passport.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("passport.isValid - convenience wrapper", () => {
  it("returns true for valid passport number", () => {
    expect(passport.isValid("C1234567")).toBe(true);
    expect(passport.isValid("X9876543")).toBe(true);
  });

  it("returns false for invalid format", () => {
    expect(passport.isValid("12345678")).toBe(false); // no letter
    expect(passport.isValid("CC123456")).toBe(false); // two letters
    expect(passport.isValid("C123456")).toBe(false); // only 6 digits
  });

  it("returns false for invalid input types", () => {
    expect(passport.isValid(null)).toBe(false);
    expect(passport.isValid(undefined)).toBe(false);
    expect(passport.isValid(12345678)).toBe(false);
  });
});
