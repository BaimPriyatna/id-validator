import { describe, expect, it } from "vitest";
import { licensePlate } from "./index.js";

describe("licensePlate.validate", () => {
  it("accepts a single-letter region with series suffix", () => {
    expect(licensePlate.validate("B 1234 XYZ").valid).toBe(true);
  });

  it("accepts a two-letter region with no series suffix", () => {
    expect(licensePlate.validate("AB 1234").valid).toBe(true);
  });

  it("is case-insensitive and separator-tolerant", () => {
    expect(licensePlate.validate("b1234xyz").valid).toBe(true);
  });

  it("rejects a number starting with 0", () => {
    expect(licensePlate.validate("B 0123 XY").valid).toBe(false);
  });

  it("rejects more than 2 region letters", () => {
    expect(licensePlate.validate("ABC 1234").valid).toBe(false);
  });

  it("rejects empty input", () => {
    expect(licensePlate.validate("").errors[0].code).toBe("REQUIRED");
  });
});

describe("licensePlate.parse", () => {
  it("splits region, number, and series", () => {
    expect(licensePlate.parse("B 1234 XYZ")).toEqual({
      regionCode: "B",
      number: "1234",
      seriesCode: "XYZ",
    });
  });

  it("throws for an invalid plate", () => {
    expect(() => licensePlate.parse("???")).toThrow();
  });
});

describe("licensePlate.format", () => {
  it("renders canonical spaced form", () => {
    expect(licensePlate.format("b1234xyz")).toBe("B 1234 XYZ");
  });

  it("omits the series segment when absent", () => {
    expect(licensePlate.format("ab1234")).toBe("AB 1234");
  });
});

describe("licensePlate.validate - input safety", () => {
  it("rejects null", () => {
    const result = licensePlate.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = licensePlate.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = licensePlate.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = licensePlate.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = licensePlate.validate(1234);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects boolean type", () => {
    const result = licensePlate.validate(false);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects object type", () => {
    const result = licensePlate.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects array type", () => {
    const result = licensePlate.validate([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects excessively long input", () => {
    const longInput = "B" + "1".repeat(1000);
    const result = licensePlate.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("licensePlate.isValid - convenience wrapper", () => {
  it("returns true for valid license plate", () => {
    expect(licensePlate.isValid("B 1234 ABC")).toBe(true);
    expect(licensePlate.isValid("DK 123 X")).toBe(true);
  });

  it("returns false for invalid format", () => {
    expect(licensePlate.isValid("B 0123 ABC")).toBe(false); // leading zero
    expect(licensePlate.isValid("B12345ABC")).toBe(false); // 5 digits
    expect(licensePlate.isValid("123 ABC")).toBe(false); // no region
  });

  it("returns false for invalid input types", () => {
    expect(licensePlate.isValid(null)).toBe(false);
    expect(licensePlate.isValid(undefined)).toBe(false);
    expect(licensePlate.isValid(1234)).toBe(false);
  });
});
