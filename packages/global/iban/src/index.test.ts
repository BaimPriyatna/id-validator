import { describe, it, expect } from "vitest";
import { iban } from "./index.js";
import countryData from "../data/iban-countries.json";

describe("iban.validate - structural cases", () => {
  it("accepts a valid German IBAN and returns the canonical form", () => {
    const r = iban.validate("DE89370400440532013000");
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.value).toBe("DE89370400440532013000");
  });

  it("accepts lowercase and grouped input, normalizing to canonical form", () => {
    const r = iban.validate("de89 3704 0044 0532 0130 00");
    expect(r.valid).toBe(true);
    expect(r.value).toBe("DE89370400440532013000");
  });

  it("tolerates arbitrary internal whitespace and newlines", () => {
    expect(iban.isValid("DE89	3704 0044\n0532 0130 00")).toBe(true);
  });

  it("accepts the shortest IBAN in the registry (NO, 15 chars)", () => {
    expect(iban.isValid("NO8330001234567")).toBe(true);
  });

  it("accepts the longest IBAN in the registry (RU, 33 chars)", () => {
    expect(iban.isValid("RU0204452560040702810412345678901")).toBe(true);
  });

  it("rejects a country code absent from the registry", () => {
    const r = iban.validate("ZZ89370400440532013000");
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("UNKNOWN_COUNTRY_CODE");
  });

  it("reports a length mismatch against the country's own IBAN length", () => {
    const r = iban.validate("DE8937040044053201300"); // one char short
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("INVALID_LENGTH");
    expect(r.errors[0].message).toContain("22");
  });

  it("rejects a correct-length IBAN with a bad checksum", () => {
    const r = iban.validate("DE89370400440532013001"); // check digits still valid length
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("INVALID_CHECKSUM");
  });

  it("rejects structurally impossible input", () => {
    for (const bad of [
      "DE89",                      // no BBAN
      "89370400440532013000",      // digits first, no country code
      "D89370400440532013000",     // one letter country code
      "DE8937040044053201300!",
    ]) {
      expect(iban.isValid(bad), bad).toBe(false);
    }
  });

  it("detects single-character transcription errors", () => {
    // Every single-digit substitution inside the BBAN must break mod-97.
    const valid = "GB33BUKB20201555555555";
    for (let i = 4; i < valid.length; i++) {
      const digit = valid[i];
      if (!/[0-9]/.test(digit)) continue;
      const mutated = valid.slice(0, i) + (digit === "9" ? "8" : String(Number(digit) + 1)) + valid.slice(i + 1);
      expect(iban.isValid(mutated), mutated).toBe(false);
    }
  });
});

describe("iban.validate - partial/experimental countries", () => {
  it("accepts a partial-country IBAN by default", () => {
    expect(iban.isValid("MA64011519000001205000534921")).toBe(true);
  });

  it("rejects a partial-country IBAN when rejectPartialCountries is set", () => {
    const r = iban.validate("MA64011519000001205000534921", { rejectPartialCountries: true });
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("PARTIAL_COUNTRY");
  });

  it("does not apply the partial rule to official countries", () => {
    expect(iban.isValid("DE89370400440532013000", { rejectPartialCountries: true })).toBe(true);
  });
});

describe("iban.validate - input safety", () => {
  it("returns INVALID_TYPE rather than throwing on non-string input", () => {
    // null/undefined are REQUIRED (not INVALID_TYPE) — that is
    // ensureValidInput()'s contract in @idvalidator/core, shared by every validator.
    for (const bad of [null, undefined]) {
      const r = iban.validate(bad as unknown);
      expect(r.valid, String(bad)).toBe(false);
      expect(r.errors[0].code).toBe("REQUIRED");
    }
    for (const bad of [123, true, {}, [], () => {}]) {
      const r = iban.validate(bad as unknown);
      expect(r.valid, String(bad)).toBe(false);
      expect(r.errors[0].code).toBe("INVALID_TYPE");
    }
  });

  it("rejects input beyond the shared max length without scanning it", () => {
    const r = iban.validate("D".repeat(5000));
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("INVALID_LENGTH");
  });

  it("returns REQUIRED for empty and whitespace-only input", () => {
    for (const bad of ["", "   ", "\t\n", "\n\t "]) {
      const r = iban.validate(bad);
      expect(r.valid).toBe(false);
      expect(r.errors[0].code).toBe("REQUIRED");
    }
  });

  it("rejects emoji and non-ASCII instead of stripping them into a valid value", () => {
    // A naive digits-only strip would turn this into a valid-looking string.
    const r = iban.validate("DE89\u{1F600}370400440532013000");
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("INVALID_FORMAT");
    expect(r.errors[0].message).toContain("ASCII");
  });

  it("does not blow the stack on very long input", () => {
    expect(iban.isValid("D".repeat(50000))).toBe(false);
  });
});

describe("iban - custom messages", () => {
  it("honors per-call message overrides", () => {
    const r = iban.validate("DE89370400440532013001", {
      messages: { INVALID_CHECKSUM: "Nomor rekening tidak valid" },
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0].message).toBe("Nomor rekening tidak valid");
  });

  it("keeps the error code intact while overriding the message", () => {
    const r = iban.validate("ZZ89370400440532013000", {
      messages: { UNKNOWN_COUNTRY_CODE: "Negara tidak dikenal" },
    });
    expect(r.errors[0].code).toBe("UNKNOWN_COUNTRY_CODE");
    expect(r.errors[0].message).toBe("Negara tidak dikenal");
  });
});

describe("iban.parse", () => {
  it("splits country, check digits and BBAN", () => {
    expect(iban.parse("DE89370400440532013000")).toEqual({
      countryCode: "DE",
      countryName: "Germany",
      checkDigits: "89",
      bban: "370400440532013000",
      isSepa: true,
    });
  });

  it("reports SEPA membership correctly in both directions", () => {
    expect(iban.parse("DE89370400440532013000").isSepa).toBe(true);
    expect(iban.parse("RS35105008123123123173").isSepa).toBe(true); // Serbia is in SEPA
    expect(iban.parse("UA903052992990004149123456789").isSepa).toBe(false);
  });

  it("throws on invalid input", () => {
    expect(() => iban.parse("DE89370400440532013001")).toThrow(/invalid IBAN/i);
    expect(() => iban.parse("ZZ89370400440532013000")).toThrow(/invalid IBAN/i);
  });
});

describe("iban - formatting", () => {
  it("normalize strips spaces and uppercases", () => {
    expect(iban.normalize("de89 3704 0044 0532 0130 00")).toBe("DE89370400440532013000");
  });

  it("format returns the canonical form", () => {
    expect(iban.format("de89370400440532013000")).toBe("DE89370400440532013000");
  });

  it("formatDisplay groups into fours", () => {
    expect(iban.formatDisplay("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("formatDisplay round-trips through validate", () => {
    for (const c of iban.listCountries()) {
      const grouped = iban.formatDisplay(c.example);
      expect(iban.isValid(grouped), c.code).toBe(true);
      expect(iban.normalize(grouped), c.code).toBe(c.example);
    }
  });
});

describe("iban registry data", () => {
  it("every declared length matches that country's example IBAN length", () => {
    const all = [...countryData.countries, ...countryData.partialCountries];
    for (const c of all) {
      expect(c.example.length, c.code).toBe(c.length);
    }
  });

  it("every registry example IBAN passes validate() by default", () => {
    for (const c of [...countryData.countries, ...countryData.partialCountries]) {
      expect(iban.isValid(c.example), c.code).toBe(true);
    }
  });

  it("strict mode accepts every official example and rejects every partial one", () => {
    for (const c of countryData.countries) {
      expect(iban.isValid(c.example, { rejectPartialCountries: true }), c.code).toBe(true);
    }
    for (const c of countryData.partialCountries) {
      expect(iban.isValid(c.example, { rejectPartialCountries: true }), c.code).toBe(false);
    }
  });

  it("has no duplicate country codes across official and partial lists", () => {
    const official = countryData.countries.map((c) => c.code);
    const partial = countryData.partialCountries.map((c) => c.code);
    const overlap = official.filter((c) => partial.includes(c));
    expect(overlap).toEqual([]);
    expect(new Set(official).size).toBe(official.length);
    expect(new Set(partial).size).toBe(partial.length);
  });

  it("exposes all registry entries via listCountries()", () => {
    expect(iban.listCountries().length).toBe(
      countryData.countries.length + countryData.partialCountries.length,
    );
  });

  it("countryInfo() returns metadata or null", () => {
    expect(iban.countryInfo("DE")?.name).toBe("Germany");
    expect(iban.countryInfo("de")?.length).toBe(22); // case-insensitive
    expect(iban.countryInfo("ZZ")).toBeNull();
  });

  it("partial countries are excluded from countryInfo's sepa flag correctness", () => {
    // Morocco is a partial country; SEPA membership must not be asserted for it.
    expect(iban.countryInfo("MA")).not.toBeNull();
    expect(iban.countryInfo("MA")!.sepa).toBe(false);
  });
});
