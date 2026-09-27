import {
  lookupProvince,
  lookupRegency,
  lookupDistrict,
  lookupPostalCode,
  districtsMatchingLevel,
  postalCodesForDistrict,
  type Province,
  type Regency,
  type District,
  type PostalSearchLevel,
} from "./index.js";

export interface Village {
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  code: string;
  name: string;
}

export interface PostalMatch {
  postalCode: string;
  province?: Province;
  regency?: Regency;
  district?: District;
  village?: Village;
}

export type AdminField = "province" | "regency" | "district" | "village";

/** Only these three -- "village" is deliberately excluded. Searching for a village by free-text name isn't offered: if you already know its parent province/regency/district codes, use listVillagesInDistrict() (a cheap exact key lookup); this package doesn't try to guess which admin level a bare query refers to. */
export type NameSearchLevel = PostalSearchLevel;

const FIELD_HIERARCHY: AdminField[] = ["province", "regency", "district", "village"];

/**
 * `fields` must list admin levels in hierarchical order with no repeats
 * (["district", "village"] ok, ["village", "district"] or ["district",
 * "district"] not) -- this is what lets the row-projection logic attach
 * objects without guessing what a caller-supplied ordering was supposed to
 * mean. Any subset is fine as long as the order climbs the hierarchy.
 */
export function isValidFieldOrder(fields: AdminField[]): boolean {
  let lastIndex = -1;
  for (const f of fields) {
    const idx = FIELD_HIERARCHY.indexOf(f);
    if (idx <= lastIndex) return false;
    lastIndex = idx;
  }
  return true;
}

const ABBREV_MAP: Record<string, AdminField> = { p: "province", r: "regency", d: "district", v: "village" };

/**
 * Parses a colon-joined fields string, e.g. "province:district" or "p:d"
 * (the two forms mix freely per-token: "province:d" is fine). Only full
 * names and single-letter abbreviations are accepted -- "prov" is not,
 * deliberately, so there's exactly one unambiguous short form per level.
 */
export function parseFieldsString(input: string): AdminField[] {
  if (input === "") return [];
  const tokens = input.split(":").map((t) => t.trim().toLowerCase());
  const fields = tokens.map((t) => {
    if (t in ABBREV_MAP) return ABBREV_MAP[t];
    if ((FIELD_HIERARCHY as string[]).includes(t)) return t as AdminField;
    throw new Error(
      `Invalid field token: "${t}". Use full name (province/regency/district/village) or single letter (p/r/d/v).`,
    );
  });
  if (!isValidFieldOrder(fields)) {
    throw new Error(`Fields must be in hierarchical order (province < regency < district < village): "${input}"`);
  }
  return fields;
}

function resolveFields(fields: AdminField[] | string | undefined, fallback: AdminField[]): AdminField[] {
  if (fields === undefined) return fallback;
  if (typeof fields === "string") return parseFieldsString(fields);
  if (!isValidFieldOrder(fields)) {
    throw new Error("fields must be in hierarchical order (province, regency, district, village) with no duplicates");
  }
  return fields;
}

function needsVillageDataset(fields: AdminField[]): boolean {
  return fields.includes("village");
}

// Regency names in this package's data carry a "Kabupaten "/"Kota " prefix
// (e.g. "Kabupaten Karawang"); strip it on both sides before comparing so a
// caller-supplied regencyName filter doesn't have to know which one applies.
const REGENCY_PREFIX = /^(Kabupaten|Kota)\s+/i;
function normalizeRegencyName(s: string): string {
  return s.replace(REGENCY_PREFIX, "").trim().toLowerCase();
}

function matchesRegencyFilter(name: string, filter: string | undefined): boolean {
  if (!filter) return true;
  return normalizeRegencyName(name) === normalizeRegencyName(filter);
}

function matchesDistrictFilter(name: string, filter: string | undefined): boolean {
  if (!filter) return true;
  return name.trim().toLowerCase() === filter.trim().toLowerCase();
}

/** Builds the dedup key from entity codes (not names, not JSON.stringify -- cheaper, and unaffected by key order). */
function rowKey(row: PostalMatch, fields: AdminField[]): string {
  const parts: string[] = [row.postalCode];
  for (const f of FIELD_HIERARCHY) {
    if (!fields.includes(f)) continue;
    if (f === "province") parts.push(row.province?.code ?? "");
    else if (f === "regency") parts.push(`${row.regency?.provinceCode ?? ""}:${row.regency?.code ?? ""}`);
    else if (f === "district")
      parts.push(`${row.district?.provinceCode ?? ""}:${row.district?.regencyCode ?? ""}:${row.district?.code ?? ""}`);
    else if (f === "village")
      parts.push(
        `${row.village?.provinceCode ?? ""}:${row.village?.regencyCode ?? ""}:` +
          `${row.village?.districtCode ?? ""}:${row.village?.code ?? ""}`,
      );
  }
  return parts.join("|");
}

/**
 * Projects each raw row down to postalCode + only the requested fields,
 * then collapses rows that are identical after projection. Used by every
 * function here that returns `output: "rows"` -- this single helper is
 * what makes "more fields => more, finer-grained rows" and "fewer fields
 * => fewer, coarser rows" fall out automatically instead of needing
 * separate logic per level/granularity combination.
 */
function dedupeRows(rawRows: PostalMatch[], fields: AdminField[]): PostalMatch[] {
  const seen = new Map<string, PostalMatch>();
  for (const raw of rawRows) {
    const projected: PostalMatch = { postalCode: raw.postalCode };
    if (fields.includes("province") && raw.province) projected.province = raw.province;
    if (fields.includes("regency") && raw.regency) projected.regency = raw.regency;
    if (fields.includes("district") && raw.district) projected.district = raw.district;
    if (fields.includes("village") && raw.village) projected.village = raw.village;
    const key = rowKey(projected, fields);
    if (!seen.has(key)) seen.set(key, projected);
  }
  return [...seen.values()];
}

interface VillageDataset {
  meta: { version: string; source: string; updatedAt: string; note: string };
  index: Record<string, [string, string, string][]>;
}

// Cached across calls; reset to null on failure so the next call retries
// instead of being stuck on a rejected promise forever.
let villageDataPromise: Promise<VillageDataset> | null = null;

function loadVillageData(): Promise<VillageDataset> {
  villageDataPromise ??= import("../data/village-postal-index.json")
    .then((mod) => (mod as unknown as { default: VillageDataset }).default)
    .catch((err: unknown) => {
      villageDataPromise = null;
      throw new Error(`Failed to load village dataset: ${err instanceof Error ? err.message : String(err)}`);
    });
  return villageDataPromise;
}

function villageRow(district: District, code: string, name: string): Village {
  return {
    provinceCode: district.provinceCode,
    regencyCode: district.regencyCode,
    districtCode: district.code,
    code,
    name,
  };
}

/**
 * All villages (desa/kelurahan) in one district, by its exact codes -- a
 * direct key lookup into the lazy-loaded village dataset, no name matching
 * at all. This is the cheapest way to get a district's villages and the
 * one real-world usage (a cascading address form: pick province, then
 * regency, then district, then village) actually needs -- if you're
 * looking for one specific village by name, list this district's villages
 * with this function and filter the small resulting array yourself.
 */
export async function listVillagesInDistrict(
  provinceCode: string,
  regencyCode: string,
  districtCode: string,
): Promise<Village[]> {
  const dataset = await loadVillageData();
  const key = `${provinceCode}:${regencyCode}:${districtCode}`;
  const rows = dataset.index[key];
  if (!rows) return [];
  const district = lookupDistrict(provinceCode, regencyCode, districtCode);
  return rows.map(([code, name]) =>
    district ? villageRow(district, code, name) : { provinceCode, regencyCode, districtCode, code, name },
  );
}

export interface SearchVillagesByNameOptions {
  /**
   * Which admin level `query` is matched against, case-insensitive
   * substring (same convention as searchPostalCodesByName). Required --
   * there's no "search everything" mode; whatever's calling this already
   * knows which field it's validating against (a province dropdown, a
   * district name from a form, etc.), and "village" isn't a valid value
   * here (see NameSearchLevel).
   */
  level: NameSearchLevel;
  /** Narrows to one specific district, exact match (case-insensitive) -- NOT substring like `query`. */
  districtName?: string;
  /** Same idea at the regency level. "Kabupaten "/"Kota " prefixes are stripped before comparing on both sides. */
  regencyName?: string;
  /**
   * "codes" (default): just the matching postal codes, deduplicated and
   * sorted. If `query` matches more than one entity (a broad level, or a
   * genuinely duplicated name -- e.g. kecamatan "Bandung" exists in Kota
   * Bandung, Tulungagung, AND Serang all at once), every one of their
   * codes gets unioned into one flat array with no attribution left --
   * same behavior as searchPostalCodesByName, not a new limitation. Only
   * safe to treat as "the" result when you're confident the match is
   * unique (narrow with districtName/regencyName first if not). Use
   * `output: "rows"` when you need to know which code came from where.
   * @default "codes"
   */
  output?: "codes" | "rows";
  /**
   * Which admin levels to attach to each row -- only relevant for
   * `output: "rows"`. Accepts an array or a colon-joined string (see
   * parseFieldsString). Defaults to just `[level]` -- e.g. searching at
   * `level: "district"` attaches only `district` to each row, not the
   * full province/regency/district chain, unless you ask for more.
   * Including "village" here is what triggers loading the ~2.5MB village
   * dataset; every other field comes from data already loaded eagerly.
   */
  fields?: AdminField[] | string;
}

export function searchVillagesByName(
  query: string,
  options: SearchVillagesByNameOptions & { output?: "codes" },
): Promise<string[]>;
export function searchVillagesByName(
  query: string,
  options: SearchVillagesByNameOptions & { output: "rows" },
): Promise<PostalMatch[]>;
export async function searchVillagesByName(
  query: string,
  options: SearchVillagesByNameOptions,
): Promise<string[] | PostalMatch[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const candidates = districtsMatchingLevel(options.level, q).filter((d) =>
    matchesDistrictFilter(d.name, options.districtName),
  );

  if (options.output !== "rows") {
    // Fast path: never touches the village dataset, regardless of `fields`
    // (fields only matters for output: "rows").
    const codes = new Set<string>();
    for (const d of candidates) {
      const regency = lookupRegency(d.provinceCode, d.regencyCode);
      if (regency && !matchesRegencyFilter(regency.name, options.regencyName)) continue;
      for (const c of postalCodesForDistrict(d.provinceCode, d.regencyCode, d.code)) codes.add(c);
    }
    return [...codes].sort();
  }

  const fields = resolveFields(options.fields, [options.level]);
  const villageDataset = needsVillageDataset(fields) ? await loadVillageData() : null;

  const rawRows: PostalMatch[] = [];
  for (const d of candidates) {
    const province = lookupProvince(d.provinceCode);
    const regency = lookupRegency(d.provinceCode, d.regencyCode);
    if (!province || !regency) continue;
    if (!matchesRegencyFilter(regency.name, options.regencyName)) continue;

    if (!villageDataset) {
      for (const postalCode of postalCodesForDistrict(d.provinceCode, d.regencyCode, d.code)) {
        rawRows.push({ postalCode, province, regency, district: d });
      }
      continue;
    }
    const key = `${d.provinceCode}:${d.regencyCode}:${d.code}`;
    for (const [code, name, postalCode] of villageDataset.index[key] ?? []) {
      rawRows.push({ postalCode, province, regency, district: d, village: villageRow(d, code, name) });
    }
  }

  return dedupeRows(rawRows, fields);
}

export interface ResolvePostalCodeVillagesOptions {
  /**
   * "district" (default): one row per matching district -- identical
   * output to the sync resolvePostalCode(), and just as cheap (doesn't
   * touch the village dataset regardless of `fields`).
   * "village": explode to one row per village that actually carries this
   * exact postal code (a district can have several codes across its
   * villages -- e.g. kecamatan Gambir has 6 -- so this filters, it
   * doesn't just list every village in the district).
   * @default "district"
   */
  granularity?: "district" | "village";
  /**
   * Which admin levels to attach to each row. Defaults to
   * `["province", "regency", "district"]` for `granularity: "district"`
   * (matching resolvePostalCode()'s always-full output) or all four for
   * `granularity: "village"`.
   */
  fields?: AdminField[] | string;
}

/**
 * Postal code -> resolved region(s), optionally down to village level.
 * Always async (the function signature is uniform even though the default
 * granularity never touches the lazy-loaded village dataset) -- see
 * resolvePostalCode() in index.ts for the plain sync equivalent when you
 * don't need village rows.
 */
export async function resolvePostalCodeVillages(
  code: string,
  options: ResolvePostalCodeVillagesOptions = {},
): Promise<PostalMatch[]> {
  const granularity = options.granularity ?? "district";
  const fields = resolveFields(
    options.fields,
    granularity === "village" ? FIELD_HIERARCHY : ["province", "regency", "district"],
  );

  const districts = lookupPostalCode(code)
    .map((m) => lookupDistrict(m.provinceCode, m.regencyCode, m.districtCode))
    .filter((d): d is District => d !== null);

  const rawRows: PostalMatch[] = [];

  if (granularity !== "village") {
    for (const d of districts) {
      const province = lookupProvince(d.provinceCode);
      const regency = lookupRegency(d.provinceCode, d.regencyCode);
      if (!province || !regency) continue;
      rawRows.push({ postalCode: code, province, regency, district: d });
    }
    return dedupeRows(rawRows, fields);
  }

  const dataset = await loadVillageData();
  for (const d of districts) {
    const province = lookupProvince(d.provinceCode);
    const regency = lookupRegency(d.provinceCode, d.regencyCode);
    if (!province || !regency) continue;
    const key = `${d.provinceCode}:${d.regencyCode}:${d.code}`;
    for (const [vCode, vName, vPostal] of dataset.index[key] ?? []) {
      if (vPostal !== code) continue;
      rawRows.push({ postalCode: code, province, regency, district: d, village: villageRow(d, vCode, vName) });
    }
  }
  return dedupeRows(rawRows, fields);
}
