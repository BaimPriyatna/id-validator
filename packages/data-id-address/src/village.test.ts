import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isValidFieldOrder,
  parseFieldsString,
  searchVillagesByName,
  resolvePostalCodeVillages,
  listVillagesInDistrict,
} from "./village.js";
import { searchPostalCodesByName } from "./index.js";
import villageData from "../data/village-postal-index.json";

describe("village dataset snapshot", () => {
  it("has the expected row counts (fails loudly if upstream data shape changes unexpectedly)", () => {
    const districtKeys = Object.keys(villageData.index);
    const totalVillages = Object.values(villageData.index).reduce((sum, rows) => sum + rows.length, 0);
    expect(districtKeys.length).toBe(7285);
    expect(totalVillages).toBe(83762);
  });
});

describe("isValidFieldOrder", () => {
  it("accepts hierarchical subsets, including a gap (skipping a level)", () => {
    expect(isValidFieldOrder(["district", "village"])).toBe(true);
    expect(isValidFieldOrder(["province", "village"])).toBe(true);
    expect(isValidFieldOrder(["province", "regency", "district", "village"])).toBe(true);
    expect(isValidFieldOrder([])).toBe(true);
  });

  it("rejects reversed order and duplicates", () => {
    expect(isValidFieldOrder(["village", "district"])).toBe(false);
    expect(isValidFieldOrder(["district", "district"])).toBe(false);
  });
});

describe("parseFieldsString", () => {
  it("mixes full-word and single-letter tokens freely", () => {
    expect(parseFieldsString("province:d")).toEqual(["province", "district"]);
    expect(parseFieldsString("p:r:d:v")).toEqual(["province", "regency", "district", "village"]);
  });

  it("rejects a half-abbreviated token like 'prov'", () => {
    expect(() => parseFieldsString("prov:district")).toThrow(/Invalid field token/);
  });

  it("rejects reversed order via the string form too", () => {
    expect(() => parseFieldsString("district:province")).toThrow(/hierarchical order/);
  });

  it("empty string means no fields", () => {
    expect(parseFieldsString("")).toEqual([]);
  });
});

describe("searchVillagesByName", () => {
  it("default fields = [level] only, no ancestor chain attached", async () => {
    const rows = await searchVillagesByName("batujaya", {
      level: "district",
      regencyName: "Karawang",
      output: "rows",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].postalCode).toBe("41354");
    expect(rows[0].district?.name).toBe("Batujaya");
    expect(rows[0]).not.toHaveProperty("province");
    expect(rows[0]).not.toHaveProperty("regency");
  });

  it("level: district, fields: province only -- the searched-on district itself does not appear", async () => {
    const rows = await searchVillagesByName("batujaya", {
      level: "district",
      regencyName: "Karawang",
      fields: "province",
      output: "rows",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].postalCode).toBe("41354");
    expect(rows[0].province?.name).toBe("Jawa Barat");
    expect(rows[0]).not.toHaveProperty("district");
  });

  it("level: province, fields: province -- many rows, same province, one row per unique code", async () => {
    const rows = await searchVillagesByName("jawa barat", { level: "province", fields: "province", output: "rows" });
    expect(rows.length).toBeGreaterThan(1);
    const provinces = new Set(rows.map((r) => r.province?.name));
    expect(provinces.size).toBe(1);
    const codes = new Set(rows.map((r) => r.postalCode));
    expect(codes.size).toBe(rows.length);
  });

  it("level: province, fields: province:district -- one row per (district, postalCode)", async () => {
    const rows = await searchVillagesByName("jawa barat", {
      level: "province",
      fields: "province:district",
      output: "rows",
    });
    for (const r of rows) {
      expect(r).toHaveProperty("province");
      expect(r).toHaveProperty("district");
      expect(r).not.toHaveProperty("regency");
    }
    expect(rows.length).toBeGreaterThan(100);
  });

  it("fields including 'village' explodes to one row per village and attaches village names", async () => {
    const rows = await searchVillagesByName("batujaya", {
      level: "district",
      regencyName: "Karawang",
      fields: "district:village",
      output: "rows",
    });
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.postalCode === "41354")).toBe(true);
    expect(rows.some((r) => r.village?.name === "Batujaya")).toBe(true);
  });

  it("districtName is exact match, not substring", async () => {
    const exact = await searchVillagesByName("karawang", { level: "regency", districtName: "Batujaya" });
    expect(exact).toEqual(["41354"]);
  });

  it("regencyName filter works with or without the 'Kabupaten'/'Kota' prefix", async () => {
    const withPrefix = await searchVillagesByName("batujaya", { level: "district", regencyName: "Kabupaten Karawang" });
    const withoutPrefix = await searchVillagesByName("batujaya", { level: "district", regencyName: "Karawang" });
    expect(withPrefix).toEqual(withoutPrefix);
    expect(withPrefix).toEqual(["41354"]);
  });

  it("fields: [] returns only postalCode, no other keys at all", async () => {
    const rows = await searchVillagesByName("batujaya", {
      level: "district",
      regencyName: "Karawang",
      fields: [],
      output: "rows",
    });
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).toEqual(["postalCode"]);
  });

  it("returns an empty array for a blank query", async () => {
    expect(await searchVillagesByName("   ", { level: "district" })).toEqual([]);
  });
});

describe("searchPostalCodesByName (existing, unaffected) -- blind-union behavior confirmed unchanged", () => {
  it("a district-level query matching multiple districts nationally unions all their codes", () => {
    // "bandung" matches kec in Kota Bandung, Tulungagung, and Serang at once.
    const codes = searchPostalCodesByName("bandung", { level: "district" });
    expect(codes.length).toBeGreaterThan(3);
  });
});

describe("listVillagesInDistrict", () => {
  it("returns every village in kec Batujaya (Karawang), no name matching involved", async () => {
    const villages = await listVillagesInDistrict("32", "15", "08");
    expect(villages).toHaveLength(10);
    expect(villages.map((v) => v.name)).toContain("Batujaya");
  });

  it("returns an empty array for an unknown district", async () => {
    expect(await listVillagesInDistrict("00", "00", "00")).toEqual([]);
  });
});

describe("resolvePostalCodeVillages", () => {
  it("granularity: 'district' (default) matches both districts for a genuinely ambiguous code, no village attached", async () => {
    const results = await resolvePostalCodeVillages("24451");
    expect(results.map((r) => r.district?.name).sort()).toEqual(["Langsa Barat", "Rantau Selamat"]);
    expect(results.every((r) => r.village === undefined)).toBe(true);
    expect(results.every((r) => r.province !== undefined && r.regency !== undefined)).toBe(true);
  });

  it("granularity: 'village' only returns villages that actually carry the queried code, not every village in the district", async () => {
    // kec Gambir has 6 different postal codes across its villages.
    const results = await resolvePostalCodeVillages("10110", { granularity: "village" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.postalCode === "10110")).toBe(true);
    expect(results.some((r) => r.village?.name === "Gambir")).toBe(true);
  });

  it("returns an empty array for an unknown code", async () => {
    expect(await resolvePostalCodeVillages("00000")).toEqual([]);
  });
});

describe("village dataset lazy-load: fast path never loads it when fields excludes 'village'", () => {
  const specifier = "../data/village-postal-index.json";

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock(specifier);
  });

  it("does not throw even if the dataset would fail to load, as long as village isn't requested", async () => {
    vi.doMock(specifier, () => {
      throw new Error("should never be loaded for this call");
    });
    const mod = await import("./village.js");
    const rows = await mod.searchVillagesByName("batujaya", {
      level: "district",
      regencyName: "Karawang",
      fields: "district",
      output: "rows",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].postalCode).toBe("41354");
    expect(rows[0].district?.name).toBe("Batujaya");
  });

  it("does throw once 'village' is requested, proving the gate actually gates something", async () => {
    vi.doMock(specifier, () => {
      throw new Error("simulated failure");
    });
    const mod = await import("./village.js");
    await expect(
      mod.searchVillagesByName("batujaya", { level: "district", fields: "district:village", output: "rows" }),
    ).rejects.toThrow(/Failed to load village dataset/);
  });
});

describe("village dataset lazy-load failure & retry", () => {
  const specifier = "../data/village-postal-index.json";

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock(specifier);
  });

  it("resets its cache on a failed load so the next call retries instead of staying rejected forever", async () => {
    let attempt = 0;
    vi.doMock(specifier, () => {
      attempt++;
      if (attempt === 1) throw new Error("simulated network failure");
      return { default: { meta: {}, index: {} } };
    });

    const mod = await import("./village.js");

    await expect(mod.listVillagesInDistrict("32", "15", "08")).rejects.toThrow(/Failed to load village dataset/);

    const second = await mod.listVillagesInDistrict("32", "15", "08");
    expect(second).toEqual([]);
    expect(attempt).toBe(2);
  });
});
