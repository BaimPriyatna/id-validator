import { describe, expect, it } from "vitest";
import { npwp } from "./index.js";

// 9-digit unique number "012345674" has a correct checksum under the
// weighted mod-11 algorithm; KPP "000", branch "000" (pusat).
const VALID_LEGACY = "012345674000000";
const INVALID_LEGACY_CHECKSUM = "012345670000000";
// Structurally valid NIK (see nik/index.test.ts), used as a NIK-based NPWP.
const VALID_NIK_BASED = "3171051708900001";

describe("npwp.validate", () => {
  it("accepts a legacy NPWP with a correct checksum", () => {
    expect(npwp.validate(VALID_LEGACY).valid).toBe(true);
  });

  it("rejects a legacy NPWP with a wrong checksum", () => {
    const result = npwp.validate(INVALID_LEGACY_CHECKSUM);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_CHECKSUM");
  });

  it("accepts a 16-digit NIK-based NPWP that is a structurally valid NIK", () => {
    expect(npwp.validate(VALID_NIK_BASED).valid).toBe(true);
  });

  it("rejects a 16-digit input that is not a structurally valid NIK", () => {
    expect(npwp.validate("1234567890123456").valid).toBe(false);
  });

  it("rejects an unsupported length", () => {
    const result = npwp.validate("123");
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
  });
});

describe("npwp.parse", () => {
  it("splits legacy NPWP into unique number, KPP, and branch code", () => {
    expect(npwp.parse(VALID_LEGACY)).toEqual({
      format: "legacy-15",
      uniqueNumber: "012345674",
      kppCode: "000",
      branchCode: "000",
    });
  });

  it("reports NIK-based format without legacy fields", () => {
    expect(npwp.parse(VALID_NIK_BASED)).toEqual({ format: "nik-16" });
  });
});

describe("npwp.format", () => {
  it("renders legacy NPWP as XX.XXX.XXX.X-XXX.XXX", () => {
    expect(npwp.format(VALID_LEGACY)).toBe("01.234.567.4-000.000");
  });
});

describe("npwp.validate - input safety", () => {
  it("rejects null", () => {
    const result = npwp.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = npwp.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = npwp.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = npwp.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = npwp.validate(123456789012345);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("number");
  });

  it("rejects boolean type", () => {
    const result = npwp.validate(false);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("boolean");
  });

  it("rejects object type", () => {
    const result = npwp.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects array type", () => {
    const result = npwp.validate([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects input with emoji", () => {
    const result = npwp.validate("012345678901234😀");
    expect(result.valid).toBe(false);
  });

  it("rejects Unicode digits", () => {
    const result = npwp.validate("０１２３４５６７８９０１２３４");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects excessively long input", () => {
    const longInput = "1".repeat(1001);
    const result = npwp.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("npwp.isValid - convenience wrapper", () => {
  it("returns true for valid legacy NPWP", () => {
    expect(npwp.isValid(VALID_LEGACY)).toBe(true);
  });

  it("returns true for valid NIK-based NPWP", () => {
    expect(npwp.isValid(VALID_NIK_BASED)).toBe(true);
  });

  it("returns false for invalid NPWP", () => {
    expect(npwp.isValid("123")).toBe(false);
    expect(npwp.isValid("001234567890123")).toBe(false);
  });

  it("returns false for invalid input types", () => {
    expect(npwp.isValid(null)).toBe(false);
    expect(npwp.isValid(undefined)).toBe(false);
    expect(npwp.isValid(123)).toBe(false);
  });
});
