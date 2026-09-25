import { describe, expect, it } from "vitest";
import { phone } from "./index.js";

describe("phone.normalize", () => {
  it("strips separators but keeps leading +", () => {
    expect(phone.normalize("+62 812-3456-789")).toBe("+628123456789");
  });

  it("does not invent a leading + for a bare national number", () => {
    expect(phone.normalize("0812 3456 789")).toBe("08123456789");
  });
});

describe("phone.validate", () => {
  it("accepts a well-formed E.164 number", () => {
    expect(phone.validate("+628123456789").valid).toBe(true);
  });

  it("rejects a number without a calling code", () => {
    const result = phone.validate("08123456789");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("MISSING_CALLING_CODE");
  });

  it("rejects an empty string", () => {
    expect(phone.validate("").errors[0].code).toBe("REQUIRED");
  });

  it("rejects an E.164-shaped number with a leading digit that's not +1-9", () => {
    // "0" is not a valid E.164 leading digit for any calling code.
    const result = phone.validate("+0123456789");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("rejects an E.164-shaped number whose prefix matches no known calling code", () => {
    // Passes the E.164 shape check (starts with +9, 9 total digits) but "999"
    // is not in the calling-code table.
    const result = phone.validate("+999123456");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("UNKNOWN_CALLING_CODE");
  });
});

describe("phone.parse", () => {
  it("splits calling code and national number", () => {
    expect(phone.parse("+62 812 3456 789")).toEqual({
      countryCallingCode: "62",
      nationalNumber: "8123456789",
    });
  });

  it("throws for an invalid number", () => {
    expect(() => phone.parse("not-a-phone")).toThrow();
  });
});

describe("phone.format", () => {
  it("renders calling code and national number with a space", () => {
    expect(phone.format("+628123456789")).toBe("+62 8123456789");
  });
});

describe("phone.validate - input safety", () => {
  it("rejects null", () => {
    const result = phone.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = phone.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = phone.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = phone.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = phone.validate(1234567890);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("number");
  });

  it("rejects boolean type", () => {
    const result = phone.validate(true);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("boolean");
  });

  it("rejects object type", () => {
    const result = phone.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects array type", () => {
    const result = phone.validate(["+1234567890"]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects input with emoji", () => {
    const result = phone.validate("+1234567890😀");
    expect(result.valid).toBe(false);
    // Emoji stripped, results in invalid format
  });

  it("rejects Unicode digits", () => {
    const result = phone.validate("+１２３４５６７８９０");
    expect(result.valid).toBe(false);
  });

  it("rejects excessively long input", () => {
    const longInput = "+1" + "2".repeat(1000);
    const result = phone.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("phone.isValid - convenience wrapper", () => {
  it("returns true for valid E.164 phone number", () => {
    expect(phone.isValid("+1234567890")).toBe(true);
    expect(phone.isValid("+628123456789")).toBe(true);
  });

  it("returns false for invalid phone number", () => {
    expect(phone.isValid("1234567890")).toBe(false); // missing +
    expect(phone.isValid("+0123456789")).toBe(false); // starts with 0
    expect(phone.isValid("+999123456789012345")).toBe(false); // unknown code
  });

  it("returns false for invalid input types", () => {
    expect(phone.isValid(null)).toBe(false);
    expect(phone.isValid(undefined)).toBe(false);
    expect(phone.isValid(123)).toBe(false);
    expect(phone.isValid({})).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(phone.isValid("")).toBe(false);
    expect(phone.isValid("   ")).toBe(false);
  });
});
