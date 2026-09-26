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

// Reverse of POSTAL_INDEX (district -> postal codes), built once at module
// load. Derived from the same postal-index.json data as lookupPostalCode(),
// not a separate dataset, so it carries that data's version/source exactly.
const DISTRICT_POSTAL_CODES = new Map<string, string[]>();
for (const [code, matches] of Object.entries(POSTAL_INDEX)) {
  for (const m of matches) {
    const key = `${m.provinceCode}:${m.regencyCode}:${m.districtCode}`;
    const list = DISTRICT_POSTAL_CODES.get(key);
    if (list) list.push(code);
    else DISTRICT_POSTAL_CODES.set(key, [code]);
  }
}

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

/**
 * postal code -> resolved region names. Composes lookupPostalCode() +
 * resolveAddress() so callers who just want names don't have to chain
 * both calls themselves. Same "usually one match, ~7.5% resolve to more
 * than one district" behavior as lookupPostalCode().
 */
export function resolvePostalCode(code: string): ResolvedAddress[] {
  return lookupPostalCode(code).map((match) => resolveAddress(match));
}

export interface PostalCodeNameMatch {
  postalCode: string;
  province: Province;
  regency: Regency;
  district: District;
}

/**
 * Region name -> postal code(s) — the reverse of resolvePostalCode().
 * Matches district names first (case-insensitive substring; district is
 * the level Indonesian postal codes are actually assigned at), since
 * that's the most common real-world lookup ("Bandung Wetan" -> 40114,
 * 40115, 40116). Falls back to a regency (city/kabupaten) name match,
 * aggregating every district's codes under it, only when nothing matches
 * at district level — a regency name is rarely also a district name, so
 * this rarely returns both. Returns [] for no match anywhere.
 *
 * Built from the same admin-hierarchy.json + postal-index.json data as
 * the rest of this package, not a separate name index — no extra dataset,
 * so it carries the same version/source/coverage caveats.
 */
export function searchPostalCodesByName(query: string): PostalCodeNameMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const collect = (districts: typeof adminData.districts): PostalCodeNameMatch[] => {
    const matches: PostalCodeNameMatch[] = [];
    for (const d of districts) {
      const codes = DISTRICT_POSTAL_CODES.get(`${d.provinceCode}:${d.regencyCode}:${d.code}`);
      if (!codes) continue;
      const province = lookupProvince(d.provinceCode);
      const regency = lookupRegency(d.provinceCode, d.regencyCode);
      if (!province || !regency) continue;
      for (const postalCode of codes) {
        matches.push({ postalCode, province, regency, district: d });
      }
    }
    return matches;
  };

  const districtMatches = collect(
    adminData.districts.filter((d) => d.name.toLowerCase().includes(q)),
  );
  if (districtMatches.length > 0) return districtMatches;

  const matchingRegencies = new Set(
    adminData.regencies.filter((r) => r.name.toLowerCase().includes(q)).map((r) => `${r.provinceCode}:${r.code}`),
  );
  if (matchingRegencies.size === 0) return [];
  return collect(
    adminData.districts.filter((d) => matchingRegencies.has(`${d.provinceCode}:${d.regencyCode}`)),
  );
}

/**
 * Area name -> vehicle plate region code(s) — the reverse of
 * lookupPlateRegion(). Case-insensitive substring match against each
 * code's areas[] list; returns every code whose area list contains a
 * match, since a query can plausibly match more than one code's areas.
 * Same authoritativeness caveat as lookupPlateRegion(): community-sourced
 * table, not an official Korlantas dataset — treat matches as a hint.
 */
export function searchPlateCodesByArea(query: string): PlateRegionMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return plateData.codes.filter((c) => c.areas.some((area) => area.toLowerCase().includes(q)));
}
