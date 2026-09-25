import { describe, expect, it } from "vitest";
import { nik } from "./index.js";

// Structurally valid synthetic NIK: province 31, regency 71, district 05,
// male born 17-08-1990, sequence 0001. Not a real registered NIK.
const VALID_MALE = "3171051708900001";
// Same but female encoding (day 17 + 40 = 57).
const VALID_FEMALE = "3171055708900001";

describe("nik.validate", () => {
  it("accepts a structurally valid male NIK", () => {
    expect(nik.validate(VALID_MALE).valid).toBe(true);
  });

  it("accepts a structurally valid female NIK", () => {
    expect(nik.validate(VALID_FEMALE).valid).toBe(true);
  });

  it("rejects wrong length", () => {
    const result = nik.validate("123");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
  });

  it("rejects non-digit characters", () => {
    expect(nik.validate("317105170890000A").valid).toBe(false);
  });

  it("rejects an impossible day-of-birth", () => {
    // day component "99" is out of range for both male (1-31) and female (41-71)
    expect(nik.validate("3171059908900001").valid).toBe(false);
  });

  it("rejects sequence 0000", () => {
    expect(nik.validate("3171051708900000").valid).toBe(false);
  });

  it("rejects district code 00 even with a recognized province/regency", () => {
    const result = nik.validate("3171001708900001");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_REGION_CODE")).toBe(true);
  });

  it("rejects an unrecognized province code", () => {
    const result = nik.validate("9971051708900001");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_REGION_CODE");
  });

  it("rejects a regency code not recognized for its province", () => {
    // Province 31 (DKI Jakarta) has no regency code "99".
    const result = nik.validate("3199051708900001");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_REGION_CODE");
  });

  it("normalizes separators before validating", () => {
    expect(nik.validate("3171 0517 0890 0001").valid).toBe(true);
  });
});

describe("nik.parse", () => {
  it("extracts region codes, birth date, gender, and sequence", () => {
    expect(nik.parse(VALID_MALE)).toEqual({
      provinceCode: "31",
      regencyCode: "71",
      districtCode: "05",
      birthDate: "1990-08-17",
      gender: "male",
      sequence: "0001",
    });
  });

  it("decodes the female day offset", () => {
    expect(nik.parse(VALID_FEMALE).gender).toBe("female");
    expect(nik.parse(VALID_FEMALE).birthDate).toBe("1990-08-17");
  });

  it("resolves a two-digit year in the 2000s range (not just 1900s)", () => {
    // Same fixture shape as VALID_MALE but year "05" instead of "90" -
    // exercises the other branch of the century heuristic.
    expect(nik.parse("3171051708050001").birthDate).toBe("2005-08-17");
  });

  it("throws for an invalid NIK", () => {
    expect(() => nik.parse("123")).toThrow();
  });
});

describe("nik.format", () => {
  it("returns the normalized 16-digit string", () => {
    expect(nik.format("3171 0517 0890 0001")).toBe(VALID_MALE);
  });

  it("throws for an invalid NIK", () => {
    expect(() => nik.format("123")).toThrow();
  });
});

describe("nik.normalize", () => {
  it("strips whitespace and separators", () => {
    expect(nik.normalize("3171 0517 0890 0001")).toBe(VALID_MALE);
  });

  it("returns an empty string for empty input", () => {
    expect(nik.normalize("")).toBe("");
  });
});

describe("nik.validate - input safety", () => {
  it("rejects null", () => {
    const result = nik.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = nik.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = nik.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = nik.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = nik.validate(1234567890123456);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("number");
  });

  it("rejects boolean type", () => {
    const result = nik.validate(true);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("boolean");
  });

  it("rejects object type", () => {
    const result = nik.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects array type", () => {
    const result = nik.validate([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects input with emoji", () => {
    const result = nik.validate("3171051708900001😀");
    expect(result.valid).toBe(false);
    // Emoji is non-ASCII and caught before digitsOnly, returning INVALID_FORMAT
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("rejects Unicode digits (fullwidth)", () => {
    // Fullwidth digits U+FF10 to U+FF19 are non-ASCII — caught by hasNonAscii guard
    const result = nik.validate("３２０１２３４５６７８９０１２３");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("rejects excessively long input", () => {
    const longInput = "1".repeat(1001);
    const result = nik.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("nik.isValid - convenience wrapper", () => {
  it("returns true for valid NIK", () => {
    expect(nik.isValid(VALID_MALE)).toBe(true);
    expect(nik.isValid(VALID_FEMALE)).toBe(true);
  });

  it("returns false for invalid NIK", () => {
    expect(nik.isValid("123")).toBe(false);
    expect(nik.isValid("317105170890000A")).toBe(false);
    expect(nik.isValid("9971051708900001")).toBe(false);
  });

  it("returns false for invalid input types", () => {
    expect(nik.isValid(null)).toBe(false);
    expect(nik.isValid(undefined)).toBe(false);
    expect(nik.isValid(123)).toBe(false);
    expect(nik.isValid({})).toBe(false);
  });

  it("returns false for empty/whitespace input", () => {
    expect(nik.isValid("")).toBe(false);
    expect(nik.isValid("   ")).toBe(false);
  });
});

describe("nik.validate - custom error messages", () => {
  it("uses custom message for INVALID_LENGTH error", () => {
    const result = nik.validate("123", {
      messages: {
        INVALID_LENGTH: "Nomor NIK harus 16 digit"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toBe("Nomor NIK harus 16 digit");
  });

  it("uses custom message for REQUIRED error", () => {
    const result = nik.validate("", {
      messages: {
        REQUIRED: "NIK wajib diisi"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
    expect(result.errors[0].message).toBe("NIK wajib diisi");
  });

  it("uses custom message for INVALID_FORMAT error", () => {
    const result = nik.validate("317105170890000A", {
      messages: {
        INVALID_FORMAT: "Format NIK tidak valid"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
    expect(result.errors[0].message).toBe("Format NIK tidak valid");
  });

  it("uses custom message for INVALID_REGION_CODE error", () => {
    const result = nik.validate("9971051708900001", {
      messages: {
        INVALID_REGION_CODE: "Kode wilayah tidak dikenali"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_REGION_CODE");
    expect(result.errors[0].message).toBe("Kode wilayah tidak dikenali");
  });

  it("uses custom message for INVALID_DATE error", () => {
    const result = nik.validate("3171059908900001", {
      messages: {
        INVALID_DATE: "Tanggal lahir tidak valid"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "INVALID_DATE")).toBe(true);
    const dateError = result.errors.find(e => e.code === "INVALID_DATE");
    expect(dateError?.message).toBe("Tanggal lahir tidak valid");
  });

  it("uses custom message for INVALID_SEQUENCE error", () => {
    const result = nik.validate("3171051708900000", {
      messages: {
        INVALID_SEQUENCE: "Nomor urut tidak valid"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_SEQUENCE");
    expect(result.errors[0].message).toBe("Nomor urut tidak valid");
  });

  it("uses default message when no custom message provided", () => {
    const result = nik.validate("123");
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("NIK must be 16 digits.");
  });

  it("supports multiple custom messages for different errors", () => {
    const result = nik.validate("9971059908900000", {
      messages: {
        INVALID_REGION_CODE: "Kode provinsi salah",
        INVALID_DATE: "Tanggal lahir salah",
        INVALID_SEQUENCE: "Nomor urut salah"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Check that at least one custom message is used
    const hasCustomMessage = result.errors.some(e => 
      e.message === "Kode provinsi salah" || 
      e.message === "Tanggal lahir salah" ||
      e.message === "Nomor urut salah"
    );
    expect(hasCustomMessage).toBe(true);
  });

  it("returns valid result with custom messages option present", () => {
    const result = nik.validate(VALID_MALE, {
      messages: {
        INVALID_LENGTH: "Custom message"
      }
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
