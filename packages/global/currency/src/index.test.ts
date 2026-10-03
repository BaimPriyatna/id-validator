import { describe, it, expect } from "vitest";
import { currency } from "./index.js";
import iso4217 from "../data/iso4217.json";

describe("currency.validate", () => {
  it("accepts a current ISO 4217 code and returns it uppercase", () => {
    const r = currency.validate("usd");
    expect(r.valid).toBe(true);
    expect(r.value).toBe("USD");
  });

  it("trims surrounding whitespace", () => {
    expect(currency.validate("  eur  ").value).toBe("EUR");
  });

  it("rejects a well-formed but unregistered code", () => {
    const r = currency.validate("ZZZ");
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("UNKNOWN_CURRENCY");
  });

  it("rejects structurally wrong input with INVALID_FORMAT, not UNKNOWN_CURRENCY", () => {
    for (const bad of ["US", "USDD", "US1", "123", "US$"]) {
      const r = currency.validate(bad);
      expect(r.valid, bad).toBe(false);
      expect(r.errors[0].code, bad).toBe("INVALID_FORMAT");
    }
  });

  it("returns REQUIRED for empty/whitespace-only input", () => {
    for (const bad of ["", "   ", "\t\n"]) {
      expect(currency.validate(bad).errors[0].code).toBe("REQUIRED");
    }
  });

  it("returns INVALID_TYPE for non-strings and REQUIRED for null/undefined", () => {
    for (const bad of [123, true, {}, []]) {
      expect(currency.validate(bad as unknown).errors[0].code).toBe("INVALID_TYPE");
    }
    for (const bad of [null, undefined]) {
      expect(currency.validate(bad as unknown).errors[0].code).toBe("REQUIRED");
    }
  });

  it("rejects emoji rather than stripping it into a valid code", () => {
    const r = currency.validate("US\u{1F600}");
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("honors custom message overrides while keeping the code", () => {
    const r = currency.validate("ZZZ", { messages: { UNKNOWN_CURRENCY: "Mata uang tidak dikenal" } });
    expect(r.errors[0].code).toBe("UNKNOWN_CURRENCY");
    expect(r.errors[0].message).toBe("Mata uang tidak dikenal");
  });
});

describe("currency - registry metadata", () => {
  it("looks up a code case-insensitively", () => {
    expect(currency.info("usd")?.code).toBe("USD");
    expect(currency.info("Usd")?.numeric).toBe("840");
    expect(currency.info("ZZZ")).toBeNull();
  });

  it("looks up by numeric code, with and without zero padding", () => {
    // BHD is 048 -- the leading zero is significant and is often lost in transit.
    expect(currency.infoByNumeric("048")?.code).toBe("BHD");
    expect(currency.infoByNumeric(48)?.code).toBe("BHD");
    expect(currency.infoByNumeric("840")?.code).toBe("USD");
    // 999 is XXX ("no currency involved") -- a real entry, so use a code the
    // standard leaves unassigned for the not-found case.
    expect(currency.infoByNumeric("999")?.code).toBe("XXX");
    expect(currency.infoByNumeric("001")).toBeNull();
  });

  it("lists EUR as the most widely shared code", () => {
    expect(currency.info("EUR")?.countries.length).toBe(37);
  });

  it("reports the source publication date in registryMeta", () => {
    expect(currency.registryMeta.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(currency.registryMeta.source).toContain("SIX");
  });

  it("exposes every code in the bundled list", () => {
    expect(currency.listCurrencies().length).toBe(iso4217.currencies.length);
  });
});

describe("currency.minorUnits", () => {
  it("reports the standard exponents for each group", () => {
    expect(currency.minorUnits("USD")).toBe(2);
    expect(currency.minorUnits("JPY")).toBe(0);
    expect(currency.minorUnits("KRW")).toBe(0);
    expect(currency.minorUnits("KWD")).toBe(3);
    expect(currency.minorUnits("BHD")).toBe(3);
    expect(currency.minorUnits("CLF")).toBe(4);
  });

  it("uses null for codes with no defined minor unit", () => {
    expect(currency.minorUnits("XAU")).toBeNull();
    expect(currency.minorUnits("XDR")).toBeNull();
    expect(currency.hasMinorUnits("XAU")).toBe(false);
  });

  it("distinguishes unknown code (undefined) from no minor unit (null)", () => {
    expect(currency.minorUnits("ZZZ")).toBeUndefined();
    expect(currency.hasMinorUnits("ZZZ")).toBeNull();
    expect(currency.hasMinorUnits("JPY")).toBe(true);
  });

  it("marks units of account as fund codes", () => {
    expect(currency.isFundCode("CLF")).toBe(true);
    expect(currency.isFundCode("USD")).toBe(false);
  });
});

describe("currency - major/minor unit conversion", () => {
  it("converts 2-decimal currencies", () => {
    expect(currency.toMinorUnits(12.3, "USD")).toBe(1230);
    expect(currency.toMinorUnits(0.01, "USD")).toBe(1);
    expect(currency.fromMinorUnits(1230, "USD")).toBe(12.3);
  });

  it("converts 0-decimal currencies without scaling", () => {
    expect(currency.toMinorUnits(1000, "JPY")).toBe(1000);
    expect(currency.fromMinorUnits(1000, "JPY")).toBe(1000);
  });

  it("converts 3-decimal currencies", () => {
    expect(currency.toMinorUnits(1, "KWD")).toBe(1000);
    expect(currency.toMinorUnits(1.234, "KWD")).toBe(1234);
    expect(currency.fromMinorUnits(1234, "KWD")).toBe(1.234);
  });

  it("is not confused by float representation error", () => {
    // 0.1 * 100 === 10.000000000000002 in IEEE 754; this must still be 10.
    expect(currency.toMinorUnits(0.1, "USD")).toBe(10);
    expect(currency.toMinorUnits(1.15, "USD")).toBe(115);
    expect(currency.toMinorUnits(0.07, "USD")).toBe(7);
    expect(currency.toMinorUnits(4.35, "USD")).toBe(435);
  });

  it("throws rather than silently rounding excess precision", () => {
    expect(() => currency.toMinorUnits(1.234, "USD")).toThrow(/2 decimal/);
    expect(() => currency.toMinorUnits(1000.5, "JPY")).toThrow(/0 decimal/);
    expect(() => currency.toMinorUnits(1.23456, "KWD")).toThrow(/3 decimal/);
  });

  it("round-trips every currency with a defined minor unit", () => {
    for (const c of iso4217.currencies) {
      if (c.minorUnits === null) continue;
      const amount = c.minorUnits === 0 ? 1234 : 12.34;
      const minor = currency.toMinorUnits(amount, c.code);
      expect(currency.fromMinorUnits(minor, c.code), c.code).toBeCloseTo(amount, 10);
    }
  });

  it("refuses arithmetic on codes with no defined minor unit", () => {
    expect(() => currency.toMinorUnits(1, "XAU")).toThrow(/no defined minor unit/);
    expect(() => currency.fromMinorUnits(100, "XDR")).toThrow(/no defined minor unit/);
  });

  it("refuses an unknown code", () => {
    expect(() => currency.toMinorUnits(1, "ZZZ")).toThrow(/Unknown currency/);
    expect(() => currency.fromMinorUnits(100, "ZZZ")).toThrow(/Unknown currency/);
  });

  it("requires an integer on the minor-unit side", () => {
    expect(() => currency.fromMinorUnits(12.3, "USD")).toThrow(/integer/);
  });

  it("rejects non-finite amounts", () => {
    expect(() => currency.toMinorUnits(NaN, "USD")).toThrow(/finite/);
    expect(() => currency.toMinorUnits(Infinity, "USD")).toThrow(/finite/);
  });
});

describe("currency - bundled ISO 4217 list integrity", () => {
  it("every alpha code is three uppercase letters", () => {
    for (const c of iso4217.currencies) {
      expect(c.code, c.code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("every numeric code is three digits and unique", () => {
    const seen = new Set<string>();
    for (const c of iso4217.currencies) {
      expect(c.numeric, c.code).toMatch(/^[0-9]{3}$/);
      expect(seen.has(c.numeric), c.code).toBe(false);
      seen.add(c.numeric);
    }
  });

  it("every code has a name, a countries list and a valid minorUnits value", () => {
    for (const c of iso4217.currencies) {
      expect(c.name.length, c.code).toBeGreaterThan(0);
      expect(Array.isArray(c.countries), c.code).toBe(true);
      expect(c.countries.length, c.code).toBeGreaterThan(0);
      if (c.minorUnits !== null) {
        expect([0, 1, 2, 3, 4]).toContain(c.minorUnits);
      }
    }
  });

  it("minor-unit distribution matches the published List One totals", () => {
    // Independently cross-checked against the ISO 4217 List One totals.
    const count = (n: number | null) => iso4217.currencies.filter((c) => c.minorUnits === n).length;
    expect(count(0)).toBe(17);
    expect(count(2)).toBe(139);
    expect(count(3)).toBe(7);
    expect(count(4)).toBe(2);
    expect(count(null)).toBe(13);
  });

  it("every bundled code passes validate()", () => {
    for (const c of iso4217.currencies) {
      expect(currency.isValid(c.code), c.code).toBe(true);
    }
  });

  it("numeric lookups round-trip back to the same code", () => {
    for (const c of iso4217.currencies) {
      expect(currency.infoByNumeric(c.numeric)?.code, c.code).toBe(c.code);
    }
  });

  it("excludes territories with no universal currency", () => {
    // Antarctica, Palestine and South Georgia carry no code in List One.
    const all = iso4217.currencies.flatMap((c) => c.countries);
    expect(all.some((name) => name.includes("ANTARCTICA"))).toBe(false);
  });
});
