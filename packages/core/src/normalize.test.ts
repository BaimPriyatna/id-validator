import { describe, expect, it } from "vitest";
import { stripWhitespace, stripSeparators, digitsOnly } from "./normalize.js";

describe("stripWhitespace", () => {
  it("removes spaces", () => {
    expect(stripWhitespace("31 71 05")).toBe("317105");
  });

  it("removes tabs and newlines", () => {
    expect(stripWhitespace("31\t71\n05")).toBe("317105");
  });

  it("collapses multiple consecutive whitespace characters", () => {
    expect(stripWhitespace("31   71")).toBe("3171");
  });

  it("returns the input unchanged when there is no whitespace", () => {
    expect(stripWhitespace("3171")).toBe("3171");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(stripWhitespace("   ")).toBe("");
  });
});

describe("stripSeparators", () => {
  it("removes the default separators (- . /)", () => {
    expect(stripSeparators("31-71.05/01")).toBe("31710501");
  });

  it("leaves non-separator characters untouched", () => {
    expect(stripSeparators("AB1234CD")).toBe("AB1234CD");
  });

  it("accepts a custom separator pattern", () => {
    expect(stripSeparators("31_71_05", /_/g)).toBe("317105");
  });

  it("returns the input unchanged when there are no separators", () => {
    expect(stripSeparators("3171")).toBe("3171");
  });
});

describe("digitsOnly", () => {
  it("keeps only digit characters", () => {
    expect(digitsOnly("+62 (812) 345-6789")).toBe("628123456789");
  });

  it("returns an empty string when there are no digits", () => {
    expect(digitsOnly("abc")).toBe("");
  });
});
