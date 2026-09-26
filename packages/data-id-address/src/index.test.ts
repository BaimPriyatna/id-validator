import { describe, expect, it } from "vitest";
import {
  lookupPostalCode,
  lookupProvince,
  lookupRegency,
  lookupDistrict,
  resolveAddress,
  lookupPlateRegion,
  resolvePostalCode,
  searchPostalCodesByName,
  searchPlateCodesByArea,
} from "./index.js";

describe("lookupPostalCode", () => {
  it("resolves a known postal code to at least one district", () => {
    const matches = lookupPostalCode("40115");
    expect(matches).toEqual([{ provinceCode: "32", regencyCode: "73", districtCode: "09" }]);
  });

  it("returns an empty array for an unknown code", () => {
    expect(lookupPostalCode("00000")).toEqual([]);
  });
});

describe("lookupProvince / lookupRegency / lookupDistrict", () => {
  it("resolves a known province", () => {
    expect(lookupProvince("32")).toEqual({ code: "32", name: "Jawa Barat" });
  });

  it("resolves a known regency", () => {
    expect(lookupRegency("32", "73")).toEqual({ provinceCode: "32", code: "73", name: "Kota Bandung" });
  });

  it("resolves a known district", () => {
    expect(lookupDistrict("32", "73", "09")).toEqual({
      provinceCode: "32",
      regencyCode: "73",
      code: "09",
      name: "Bandung Wetan",
    });
  });

  it("returns null for unknown codes", () => {
    expect(lookupProvince("99")).toBeNull();
    expect(lookupRegency("32", "99")).toBeNull();
    expect(lookupDistrict("32", "73", "99")).toBeNull();
  });
});

describe("resolveAddress", () => {
  it("composes province, regency, and district", () => {
    const result = resolveAddress({ provinceCode: "32", regencyCode: "73", districtCode: "09" });
    expect(result.province?.name).toBe("Jawa Barat");
    expect(result.regency?.name).toBe("Kota Bandung");
    expect(result.district?.name).toBe("Bandung Wetan");
  });

  it("leaves district null when not provided", () => {
    const result = resolveAddress({ provinceCode: "32", regencyCode: "73" });
    expect(result.district).toBeNull();
  });
});

describe("lookupPlateRegion", () => {
  it("resolves a known plate region code", () => {
    expect(lookupPlateRegion("B")).toEqual({
      code: "B",
      areas: ["Jakarta", "Bekasi", "Depok", "Tangerang"],
    });
  });

  it("is case-insensitive", () => {
    expect(lookupPlateRegion("b")?.areas).toContain("Jakarta");
  });

  it("returns null for an unrecognized code", () => {
    expect(lookupPlateRegion("ZZ")).toBeNull();
  });
});

describe("resolvePostalCode", () => {
  it("resolves a postal code straight to names", () => {
    const [result] = resolvePostalCode("40115");
    expect(result.province?.name).toBe("Jawa Barat");
    expect(result.regency?.name).toBe("Kota Bandung");
    expect(result.district?.name).toBe("Bandung Wetan");
  });

  it("returns an empty array for an unknown code", () => {
    expect(resolvePostalCode("00000")).toEqual([]);
  });
});

describe("searchPostalCodesByName", () => {
  it("defaults to district-level match, codes only", () => {
    const results = searchPostalCodesByName("Bandung Wetan");
    expect(results).toEqual(["40114", "40115", "40116"]);
  });

  it("is case-insensitive and matches substrings", () => {
    expect(searchPostalCodesByName("bandung wetan")).toEqual(["40114", "40115", "40116"]);
  });

  it("output: 'all' returns full province/regency/district objects", () => {
    const results = searchPostalCodesByName("Bandung Wetan", { output: "all" });
    expect(results.map((r) => r.postalCode).sort()).toEqual(["40114", "40115", "40116"]);
    expect(results[0].regency.name).toBe("Kota Bandung");
    expect(results[0].province.name).toBe("Jawa Barat");
  });

  it("level: 'district' does not match a regency-only name", () => {
    // "Kota Bandung" is a regency name, not a district name.
    expect(searchPostalCodesByName("Kota Bandung")).toEqual([]);
  });

  it("level: 'regency' matches a city/kabupaten name and aggregates its districts", () => {
    const results = searchPostalCodesByName("Kota Bandung", { level: "regency" });
    expect(results.length).toBeGreaterThan(3);
    expect(results).toContain("40115");
  });

  it("level: 'regency' with output: 'all' includes regency names on every entry", () => {
    const results = searchPostalCodesByName("Kota Bandung", { level: "regency", output: "all" });
    expect(results.every((r) => r.regency.name === "Kota Bandung")).toBe(true);
  });

  it("level: 'province' aggregates every district under matching provinces", () => {
    const results = searchPostalCodesByName("Jawa Barat", { level: "province" });
    expect(results.length).toBeGreaterThan(100);
    expect(results).toContain("40115");
  });

  it("returns an empty array for an unknown name", () => {
    expect(searchPostalCodesByName("Nonexistent Place Xyz")).toEqual([]);
  });

  it("returns an empty array for a blank query", () => {
    expect(searchPostalCodesByName("   ")).toEqual([]);
  });
});

describe("searchPlateCodesByArea", () => {
  it("finds the code for a known area", () => {
    expect(searchPlateCodesByArea("Jakarta")).toEqual([
      { code: "B", areas: ["Jakarta", "Bekasi", "Depok", "Tangerang"] },
    ]);
  });

  it("is case-insensitive and matches substrings", () => {
    expect(searchPlateCodesByArea("band")).toEqual([{ code: "D", areas: ["Bandung", "Cimahi"] }]);
  });

  it("returns an empty array for an unknown area", () => {
    expect(searchPlateCodesByArea("Nonexistent City")).toEqual([]);
  });

  it("returns an empty array for a blank query", () => {
    expect(searchPlateCodesByArea("   ")).toEqual([]);
  });
});
