import { describe, expect, it } from "vitest";
import { sim } from "./index.js";

describe("sim.validate", () => {
  it("accepts a 12-digit number", () => {
    expect(sim.validate("123456789012").valid).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(sim.validate("123").valid).toBe(false);
  });

  it("rejects empty input", () => {
    expect(sim.validate("").errors[0].code).toBe("REQUIRED");
  });
});

describe("sim.validate - input safety", () => {
  it("rejects null", () => {
    const result = sim.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects undefined", () => {
    const result = sim.validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects empty string", () => {
    const result = sim.validate("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects whitespace-only string", () => {
    const result = sim.validate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("REQUIRED");
  });

  it("rejects number type", () => {
    const result = sim.validate(123456789012);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects boolean type", () => {
    const result = sim.validate(false);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects object type", () => {
    const result = sim.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects array type", () => {
    const result = sim.validate([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_TYPE");
  });

  it("rejects excessively long input", () => {
    const longInput = "1".repeat(1001);
    const result = sim.validate(longInput);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_LENGTH");
    expect(result.errors[0].message).toContain("maximum length");
  });
});

describe("sim.isValid - convenience wrapper", () => {
  it("returns true for valid 12-digit SIM", () => {
    expect(sim.isValid("123456789012")).toBe(true);
  });

  it("returns false for invalid length", () => {
    expect(sim.isValid("123")).toBe(false);
    expect(sim.isValid("12345678901234")).toBe(false);
  });

  it("returns false for invalid input types", () => {
    expect(sim.isValid(null)).toBe(false);
    expect(sim.isValid(undefined)).toBe(false);
    expect(sim.isValid(123)).toBe(false);
  });
});
