import postalData from "../data/postal-index.json";
import adminData from "../data/admin-hierarchy.json";
import plateData from "../data/plate-region-codes.json";

export interface PostalRegionMatch {
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
}

export interface Province {
  code: string;
  name: string;
}

export interface Regency {
  provinceCode: string;
  code: string;
  name: string;
}

export interface District {
  provinceCode: string;
  regencyCode: string;
  code: string;
  name: string;
}

export interface ResolvedAddress {
  province: Province | null;
  regency: Regency | null;
  district: District | null;
}

export interface PlateRegionMatch {
  code: string;
  areas: string[];
}

const POSTAL_INDEX = postalData.index as Record<string, PostalRegionMatch[]>;
const PROVINCES = new Map(adminData.provinces.map((p) => [p.code, p]));
const REGENCIES = new Map(
  adminData.regencies.map((r) => [`${r.provinceCode}:${r.code}`, r]),
);
const DISTRICTS = new Map(
  adminData.districts.map((d) => [`${d.provinceCode}:${d.regencyCode}:${d.code}`, d]),
);
const PLATE_CODES = new Map(plateData.codes.map((c) => [c.code, c]));

/**
 * Looks up which district(s) a 5-digit Indonesian postal code is assigned
 * to. Most codes resolve to exactly one district; some (~7.5% of codes in
 * the source data) resolve to more than one, in which case every match is
 * returned — that reflects a real ambiguity in the underlying dataset, not
 * a defect in the lookup. Returns an empty array for an unknown code.
 */
export function lookupPostalCode(code: string): PostalRegionMatch[] {
  return POSTAL_INDEX[code] ?? [];
}

export function lookupProvince(provinceCode: string): Province | null {
  return PROVINCES.get(provinceCode) ?? null;
}

export function lookupRegency(provinceCode: string, regencyCode: string): Regency | null {
  return REGENCIES.get(`${provinceCode}:${regencyCode}`) ?? null;
}

export function lookupDistrict(
  provinceCode: string,
  regencyCode: string,
  districtCode: string,
): District | null {
  return DISTRICTS.get(`${provinceCode}:${regencyCode}:${districtCode}`) ?? null;
}

/**
 * Composes the three lookups above into full names for a code chain — the
 * intended way to turn the raw codes returned by nik.parse() (or a
 * lookupPostalCode() match) into a human-readable address. districtCode is
 * optional since nik.parse() always returns one but idvalidator-id's own
 * validate() only checks it's not "00" (no district-level dataset is
 * bundled in the core package) — this package is how you get a real check.
 */
export function resolveAddress(codes: {
  provinceCode: string;
  regencyCode: string;
  districtCode?: string;
}): ResolvedAddress {
  return {
    province: lookupProvince(codes.provinceCode),
    regency: lookupRegency(codes.provinceCode, codes.regencyCode),
    district: codes.districtCode
      ? lookupDistrict(codes.provinceCode, codes.regencyCode, codes.districtCode)
      : null,
  };
}

/**
 * Looks up the area(s) associated with an Indonesian vehicle plate region
 * code (e.g. "B" -> Jakarta/Bekasi/Depok/Tangerang), for use with
 * licensePlate.parse()'s regionCode.
 *
 * UNLIKE every other lookup in this package, this table is NOT sourced from
 * an official Kemendagri dataset — plate region codes are a Polri/Korlantas
 * assignment, and no official machine-readable open dataset for them is
 * known to exist. This table was community-supplied and cross-checked
 * against public news/automotive articles, which are themselves not always
 * consistent with each other. Treat matches as a helpful hint, not a
 * verified fact — see `data/plate-region-codes.json`'s `meta` for details.
 * Returns null for an unrecognized code.
 */
export function lookupPlateRegion(code: string): PlateRegionMatch | null {
  return PLATE_CODES.get(code.toUpperCase()) ?? null;
}
