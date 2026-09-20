import { describe, expect, it } from "vitest";
import { phone } from "./index.js";

describe("phone.validate (Indonesia-aware)", () => {
  it("accepts international format with +", () => {
    expect(phone.validate("+628123456789").valid).toBe(true);
  });

  it("accepts common local format with leading 0", () => {
    expect(phone.validate("08123456789").valid).toBe(true);
  });

  it("accepts 62-prefixed format without a leading +", () => {
    expect(phone.validate("628123456789").valid).toBe(true);
  });

  it("accepts dash separators in local format", () => {
    expect(phone.validate("0812-3456-789").valid).toBe(true);
  });

  it("accepts dash separators in international format", () => {
    expect(phone.validate("+62 812-3456-789").valid).toBe(true);
  });

  it("rejects empty input", () => {
    expect(phone.validate("").errors[0].code).toBe("REQUIRED");
  });
});

describe("phone.normalize (Indonesia-aware)", () => {
  it("converts leading 0 to +62", () => {
    expect(phone.normalize("0812-3456-789")).toBe("+628123456789");
  });
});

describe("phone.parse (Indonesia-aware)", () => {
  it("parses a local-format number the same as international", () => {
    expect(phone.parse("08123456789")).toEqual({
      countryCallingCode: "62",
      nationalNumber: "8123456789",
    });
  });
});

describe("phone.format (Indonesia-aware)", () => {
  it("renders a local-format number in international form", () => {
    expect(phone.format("0812-3456-789")).toBe("+62 8123456789");
  });
});

describe("phone.isValid - convenience wrapper", () => {
  it("returns true for valid Indonesian phone", () => {
    expect(phone.isValid("08123456789")).toBe(true);
    expect(phone.isValid("+628123456789")).toBe(true);
    expect(phone.isValid("62-812-3456-789")).toBe(true);
  });

  it("returns false for invalid phone", () => {
    expect(phone.isValid("123")).toBe(false);
    expect(phone.isValid("+1234")).toBe(false);
  });

  it("returns false for invalid input types", () => {
    expect(phone.isValid(null)).toBe(false);
    expect(phone.isValid(undefined)).toBe(false);
    expect(phone.isValid(123)).toBe(false);
  });
});
