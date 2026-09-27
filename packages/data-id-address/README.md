# @idvalidator/data-id-address

Optional Indonesia address reference data for use alongside
`idvalidator-id`: full province/regency/district hierarchy (with names)
and a postal-code -> district reverse index. Kept separate on purpose —
see "Why a separate package" below.

```bash
npm install @idvalidator/data-id-address
```

```ts
import { nik, postalCode } from "idvalidator-id";
import { resolveAddress, lookupPostalCode } from "@idvalidator/data-id-address";

// Resolve a NIK's codes to real province/regency/district names
const parsed = nik.parse("3171051708900001");
resolveAddress(parsed);
// { province: { code: "31", name: "Daerah Khusus Ibukota Jakarta" },
//   regency:  { code: "71", name: "Kota Administrasi Jakarta Pusat" },
//   district: { code: "05", name: "Cempaka Putih" } }

// Resolve a postal code to its district, then to full names
const code = "40115";
if (postalCode.validate(code).valid) {
  const [match] = lookupPostalCode(code); // { provinceCode: "32", regencyCode: "73", districtCode: "09" }
  if (match) resolveAddress(match);
  // { province: { name: "Jawa Barat" }, regency: { name: "Kota Bandung" }, district: { name: "Bandung Wetan" } }
}
```

## API

- `lookupProvince(provinceCode)` -> `{ code, name } | null`
- `lookupRegency(provinceCode, regencyCode)` -> `{ provinceCode, code, name } | null`
- `lookupDistrict(provinceCode, regencyCode, districtCode)` -> `{ provinceCode, regencyCode, code, name } | null`
- `resolveAddress({ provinceCode, regencyCode, districtCode? })` -> composes the three above
- `lookupPostalCode(code)` -> `{ provinceCode, regencyCode, districtCode }[]` — usually one match; ~7.5% of real postal codes resolve to more than one district, so all matches are returned
- `resolvePostalCode(code)` -> `ResolvedAddress[]` — `lookupPostalCode` + `resolveAddress` in one call
- `searchPostalCodesByName(query, options?)` -> `string[]` (default) or `PostalCodeNameMatch[]` (`output: "all"`) — reverse of `resolvePostalCode`: region name -> postal code(s)
  - `options.level`: `"province" | "regency" | "district"` (default `"district"`) — which admin level to match `query` against. Postal codes are assigned at district (kecamatan/kelurahan) level; there's no separate village/desa table in this dataset
  - `options.output`: `"codes"` (default, just the postal codes, deduplicated + sorted) or `"all"` (full province/regency/district objects per match — one entry per postal code, so a broad `level` repeats names across many entries)
- `lookupPlateRegion(code)` -> `{ code, areas } | null` — **community-sourced, not official** (see below)
- `searchPlateCodesByArea(query)` -> `{ code, areas }[]` — reverse of `lookupPlateRegion`: area name -> plate region code(s). Case-insensitive substring match against each code's area list

### Village-level (desa/kelurahan) — async, lazy-loaded

Everything above resolves down to district (kecamatan) level and loads
eagerly with the rest of this package. Three more functions go one level
deeper, to individual desa/kelurahan — but the dataset behind them is
~2.5 MB raw / ~650 KB gzipped, so it's dynamically `import()`-ed only when
actually needed, not bundled with everything else. **These are the only
async functions in this package** — everything above stays synchronous,
and calls that don't ask for village-level data never trigger the load at
all (see the `fields` note below).

**Read this before using them:** going to village level does **not** fix
the ambiguity in `lookupPostalCode`/`resolvePostalCode` — 7.52% of postal
codes genuinely span more than one district (kecamatan) regardless of
which level you look at, a real property of how codes were assigned, not
an artifact of aggregating to district level. What village data *does*
add is completeness of the address name itself (matching how Indonesian
postal-code sites conventionally show the desa name even when the code is
shared), and — for the ~17.56% of districts (1,279 of 7,285) that
genuinely have more than one postal code across their villages — the
ability to narrow a code down to which specific village(s) carry it. The
rest, including kecamatan Batujaya below, share one code across every
village in them.

There's no free-text village-name search. If you already know a village's
parent province/regency/district codes (a cascading address form), use
`listVillagesInDistrict` — a plain key lookup, cheaper than any name
match. If you don't, `searchVillagesByName` still searches by
province/regency/district name (`level` is required and excludes
`"village"` on purpose) and can attach village rows to the result via
`fields`.

- `listVillagesInDistrict(provinceCode, regencyCode, districtCode)` -> `Promise<Village[]>` — every village in one district, exact key lookup, no name matching at all
- `searchVillagesByName(query, { level, ... })` -> `Promise<string[] | PostalMatch[]>` — region name -> postal code(s), same idea as `searchPostalCodesByName` but able to reach down to village rows
  - `level`: **required**, `"province" | "regency" | "district"` — which level `query` matches against, case-insensitive substring. No `"village"` option and no default: whatever's calling this already knows which field it's searching against
  - `output`: `"codes"` (default) — deduplicated, sorted `string[]`, never touches the village dataset regardless of `fields`. `"rows"` — `PostalMatch[]`, one row per unique combination of the requested `fields` (see below)
  - `fields` (only used by `output: "rows"`): which levels to attach to each row — an array (`["district", "village"]`, must be in hierarchical order) or a colon-joined string mixing full names and single-letter shorthands (`"district:village"`, `"d:v"`, `"district:v"` all work; `"prov"` is rejected — only full names or `p`/`r`/`d`/`v`). Defaults to `[level]` alone: searching at `level: "district"` attaches only `district` to each row unless you ask for more. Including `"village"` is what triggers the lazy load
  - `districtName` / `regencyName`: **exact match** (unlike `query` itself) — extra narrowing, independent of `level`. `regencyName` accepts the name with or without its "Kabupaten"/"Kota" prefix
- `resolvePostalCodeVillages(code, { granularity, fields })` -> `Promise<PostalMatch[]>` — postal code -> region(s)
  - `granularity`: `"district"` (default, identical output to the sync `resolvePostalCode` — doesn't touch the village dataset at all) or `"village"` (only villages that actually carry this exact code, since one district can have several — e.g. kec Gambir has 6)
  - `fields`: same array-or-string form as above. Defaults to `["province", "regency", "district"]` for `granularity: "district"`, or all four for `"village"`
- `isValidFieldOrder(fields)` / `parseFieldsString(input)` -> exported in case you want to validate or parse a `fields` value yourself before calling

**How rows are built:** every match (a village row, if `fields` includes
`"village"`, otherwise a district) is projected down to `postalCode` plus
only the requested `fields`, then rows that are now identical get
collapsed into one. This is why `level: "province", fields: "province"`
gives one row per unique postal code in that whole province — every
underlying village row shares the same (province-only) projection except
for `postalCode` — while adding `"district"` to `fields` splits that back
out to one row per `(district, postalCode)` pair. `output: "codes"`
inherits `searchPostalCodesByName`'s existing "blind union" behavior on a
broad or genuinely duplicated name (e.g. kecamatan "Bandung" exists in
Kota Bandung, Tulungagung, *and* Serang) — every match's codes get merged
into one flat array with no attribution. Narrow with `districtName`/
`regencyName` first, or use `output: "rows"`, when that matters.

```ts
import { searchVillagesByName, resolvePostalCodeVillages, listVillagesInDistrict } from "@idvalidator/data-id-address";

// Default fields = [level] only -- no province/regency attached.
await searchVillagesByName("batujaya", { level: "district", regencyName: "Karawang", output: "rows" });
// [{ postalCode: "41354", district: { name: "Batujaya", ... } }]

// Ask for village rows explicitly -- explodes to all 10 desa, same code.
await searchVillagesByName("batujaya", {
  level: "district",
  regencyName: "Karawang",
  fields: "district:village",
  output: "rows",
});
// 10 rows, each { postalCode: "41354", district: {...}, village: {...} }

// kec Gambir has 6 postal codes across its villages -- narrow to which villages have this one.
await resolvePostalCodeVillages("10110", { granularity: "village" });
// [{ postalCode: "10110", province: {...}, regency: {...}, district: {...Gambir}, village: { name: "Gambir", ... } }]

// Already know the codes (e.g. from a cascading form)? Skip search entirely.
await listVillagesInDistrict("32", "15", "08"); // kec Batujaya
// [{ name: "Batujaya", code: "1001", ... }, { name: "Telukambulu", ... }, ...10 total]
```

```ts
import { searchPostalCodesByName, searchPlateCodesByArea } from "@idvalidator/data-id-address";

searchPostalCodesByName("Bandung Wetan");
// ["40114", "40115", "40116"]

searchPostalCodesByName("Bandung", { level: "regency", output: "all" });
// [{ postalCode: "40111", province: {...Jawa Barat}, regency: {...Kota Bandung}, district: {...} }, ...]

searchPlateCodesByArea("Bandung");
// [{ code: "D", areas: ["Bandung", "Cimahi"] }]
```

## Why a separate package

`idvalidator-id`'s core `nik` and `postalCode` validators already embed a
small province+regency dataset (enough to validate those two levels — see
[REFERENCE.md](https://github.com/BaimPriyatna/id-validator/blob/main/REFERENCE.md)). Full district-level names (7,265 entries) and the
postal reverse index push that past a reasonable default-bundle size (PRD
§18 targets 15 KB gzip for the core package) — most consumers never need
name resolution, just structural validation. Install this package only if
you do.

## Data

- `data/admin-hierarchy.json` — provinces, regencies, and districts with
  codes + names. Provinces/regencies: Kepmendagri No. 300.2.2-2430 Tahun
  2025, via github.com/cahyadsn/wilayah (MIT). Districts: same Kepmendagri
  reference, via github.com/lokabisa-oss/region-id (MIT) — a
  reproducible, FK-validated pipeline parsed directly from the official
  Kepmendagri PDF; used here because it's complete (7,285/7,285 districts)
  where an earlier hand-extracted source was missing 20.
- `data/postal-index.json` — postal code -> district(s). Source: Kepmendagri
  No. 300.2.2-3128 Tahun 2025, via github.com/cahyadsn/wilayah_kodepos
  (MIT License), derived from an 83,762-row village-level dataset. Every
  district code in this index was cross-checked against `admin-hierarchy.json`
  with zero mismatches.
- `data/village-postal-index.json` — village (desa/kelurahan) codes + names
  + postal code, grouped by district. Source: Kepmendagri No.
  300.2.2-2138 Tahun 2025, via github.com/cahyadsn/wilayah (`db/wilayah.sql`,
  MIT License) joined with github.com/cahyadsn/wilayah_kodepos
  (`json/wilayah_kodepos.min.json`, MIT License) — 83,762 villages, all
  resolving to a postal code (0 missing). Built with
  `npm run build:data:village`, run manually when upstream data changes
  (this file is committed, not regenerated on every `npm run build`).
  Note this is a slightly older Kepmendagri revision (2138) than
  `admin-hierarchy.json`'s (2430); despite that, all 7,285 district codes
  matched exactly (0 mismatches) when cross-checked, so the two sources
  join cleanly regardless.
- `data/plate-region-codes.json` — vehicle plate region code -> area name(s).
  **Not from an official dataset** — see the section below.

## Not included as verified data: vehicle license plate region codes

Indonesian plate region codes (e.g. "B" -> Jakarta, "D" -> Bandung) are a
Polri/Korlantas administrative assignment, not a Kemendagri code — and
unlike the data above, there's no official machine-readable open dataset
for it, only scattered, sometimes-inconsistent news articles. This package
does include a `lookupPlateRegion(code)` table (community-supplied,
cross-checked against public sources), but it's explicitly flagged as
**not officially verified** — see its own doc comment and
`data/plate-region-codes.json`'s `meta.source`. Treat it as a helpful
hint, not ground truth the way the province/regency/district/postal
lookups above are.
