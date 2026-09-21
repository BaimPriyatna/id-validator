# @idvalidator/data-id-address

Optional Indonesia address reference data for use alongside
`id-validator-id`: full province/regency/district hierarchy (with names)
and a postal-code -> district reverse index. Kept separate on purpose —
see "Why a separate package" below.

```bash
npm install @idvalidator/data-id-address
```

```ts
import { nik, postalCode } from "id-validator-id";
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
- `lookupPlateRegion(code)` -> `{ code, areas }[string] | null` — **community-sourced, not official** (see below)

## Why a separate package

`id-validator-id`'s core `nik` and `postalCode` validators already embed a
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
