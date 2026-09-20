import { describe, expect, it } from "vitest";
import { email } from "./index.js";

describe("email.validate", () => {
  it("accepts a well-formed address", () => {
    expect(email.validate("user@example.com").valid).toBe(true);
  });

  it("rejects a missing @", () => {
    expect(email.validate("userexample.com").valid).toBe(false);
  });

  it("rejects a missing TLD", () => {
    expect(email.validate("user@example").valid).toBe(false);
  });

  it("rejects whitespace inside the address", () => {
    expect(email.validate("us er@example.com").valid).toBe(false);
  });

  it("rejects empty input", () => {
    expect(email.validate("").errors[0].code).toBe("REQUIRED");
  });
});

describe("email.normalize", () => {
  it("trims and lowercases", () => {
    expect(email.normalize(" User@Example.COM ")).toBe("user@example.com");
  });
});

describe("email.parse", () => {
  it("splits local part and domain", () => {
    expect(email.parse("User@Example.com")).toEqual({ localPart: "user", domain: "example.com" });
  });

  it("throws for an invalid email", () => {
    expect(() => email.parse("not-an-email")).toThrow();
  });
});

describe("email.validate - input safety", () => {
  it("rejects null", () => {
    const result = email.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = email.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = email.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = email.validate(123);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("number");
  });

  it("rejects boolean type", () => {
    const result = email.validate(false);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("boolean");
  });

  it("rejects object type", () => {
    const result = email.validate({ email: "test@example.com" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects array type", () => {
    const result = email.validate(["test@example.com"]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
    expect(result.errors[0].message).toContain("object");
  });

  it("rejects input with emoji", () => {
    const result = email.validate("user😀@example.com");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("rejects excessively long input", () => {
    const longInput = "a".repeat(1001) + "@example.com";
    const result = email.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("email.isValid - convenience wrapper", () => {
  it("returns true for valid email", () => {
    expect(email.isValid("user@example.com")).toBe(true);
    expect(email.isValid("test.user+tag@subdomain.example.co.uk")).toBe(true);
  });

  it("returns false for invalid email", () => {
    expect(email.isValid("userexample.com")).toBe(false);
    expect(email.isValid("user@example")).toBe(false);
    expect(email.isValid("us er@example.com")).toBe(false);
  });

  it("returns false for invalid input types", () => {
    expect(email.isValid(null)).toBe(false);
    expect(email.isValid(undefined)).toBe(false);
    expect(email.isValid(123)).toBe(false);
    expect(email.isValid({})).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(email.isValid("")).toBe(false);
    expect(email.isValid("   ")).toBe(false);
  });
});

describe("email.validate - custom error messages", () => {
  it("uses custom message for INVALID_FORMAT error", () => {
    const result = email.validate("not-an-email", {
      messages: {
        INVALID_FORMAT: "Format email tidak valid"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
    expect(result.errors[0].message).toBe("Format email tidak valid");
  });

  it("uses custom message for REQUIRED error", () => {
    const result = email.validate("", {
      messages: {
        REQUIRED: "Email wajib diisi"
      }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
    expect(result.errors[0].message).toBe("Email wajib diisi");
  });

  it("uses default message when no custom message provided", () => {
    const result = email.validate("not-an-email");
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Email does not match the expected local@domain.tld shape.");
  });
});
