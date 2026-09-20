import { describe, expect, it } from "vitest";
import { lookupPostalCode, lookupProvince, lookupRegency, lookupDistrict, resolveAddress, lookupPlateRegion } from "./index.js";

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
