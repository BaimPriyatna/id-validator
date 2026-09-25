import { describe, expect, it } from "vitest";
import { ensureValidInput, hasNonAscii, hasOnlyExpectedCharacters, MAX_INPUT_LENGTH } from "./input-safety.js";

describe("ensureValidInput", () => {
  it("returns the string unchanged when it is valid", () => {
    expect(ensureValidInput("3171051708900001")).toBe("3171051708900001");
  });

  it("rejects null as REQUIRED", () => {
    const result = ensureValidInput(null);
    expect(typeof result).not.toBe("string");
    if (typeof result !== "string") {
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("REQUIRED");
    }
  });

  it("rejects undefined as REQUIRED", () => {
    const result = ensureValidInput(undefined);
    if (typeof result !== "string") {
      expect(result.errors[0].code).toBe("REQUIRED");
    }
  });

  it("rejects a number as INVALID_TYPE", () => {
    const result = ensureValidInput(123);
    if (typeof result !== "string") {
      expect(result.errors[0].code).toBe("INVALID_TYPE");
      expect(result.errors[0].message).toContain("number");
    }
  });

  it("rejects a boolean as INVALID_TYPE", () => {
    const result = ensureValidInput(true);
    if (typeof result !== "string") {
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    }
  });

  it("rejects an object as INVALID_TYPE", () => {
    const result = ensureValidInput({});
    if (typeof result !== "string") {
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    }
  });

  it("rejects an array as INVALID_TYPE", () => {
    const result = ensureValidInput([]);
    if (typeof result !== "string") {
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    }
  });

  it("accepts input right at MAX_INPUT_LENGTH", () => {
    const input = "1".repeat(MAX_INPUT_LENGTH);
    expect(ensureValidInput(input)).toBe(input);
  });

  it("rejects input over MAX_INPUT_LENGTH as INVALID_LENGTH", () => {
    const result = ensureValidInput("1".repeat(MAX_INPUT_LENGTH + 1));
    if (typeof result !== "string") {
      expect(result.errors[0].code).toBe("INVALID_LENGTH");
    }
  });
});

describe("hasNonAscii", () => {
  it("returns false for plain ASCII digits and letters", () => {
    expect(hasNonAscii("NIK3171ABC")).toBe(false);
  });

  it("returns true for emoji", () => {
    expect(hasNonAscii("3171😀")).toBe(true);
  });

  it("returns true for fullwidth Unicode digits", () => {
    expect(hasNonAscii("３１７１")).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(hasNonAscii("")).toBe(false);
  });
});

describe("hasOnlyExpectedCharacters", () => {
  it("accepts digits and the default allowed separators", () => {
    expect(hasOnlyExpectedCharacters("3171-05.17/01")).toBe(true);
  });

  it("rejects letters under the default pattern", () => {
    expect(hasOnlyExpectedCharacters("ABC123")).toBe(false);
  });

  it("rejects emoji under the default pattern", () => {
    expect(hasOnlyExpectedCharacters("123😀")).toBe(false);
  });

  it("accepts a custom allowed pattern", () => {
    expect(hasOnlyExpectedCharacters("ABC123", /^[A-Z0-9]+$/)).toBe(true);
  });
});
