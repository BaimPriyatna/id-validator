# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **`@idvalidator/global-currency`** (new package, 1.0.0) — ISO 4217 currency
  reference data: code validation, registry lookups (by alpha or 3-digit
  numeric code, as used in ISO 8583 DE49 / card data), minor-unit precision, and
  `toMinorUnits()` / `fromMinorUnits()` conversion. 178 codes parsed directly
  from the official SIX ISO 4217 List One XML (`Pblshd="2026-09-17"`), so
  minor-unit exponents come from the Maintenance Agency rather than copied
  around the web — including the 17 zero-decimal, 7 three-decimal and 2
  four-decimal currencies, and the 13 codes the standard gives no minor unit at
  all. `toMinorUnits()` throws on an amount carrying more precision than the
  currency uses, rather than silently rounding. No exchange rates are bundled:
  rates need a live or licensed source, and a stale copy is worse than none
- `EXAMPLES.md` — Express middleware, Zod `.refine()` / `.superRefine()`, and
  React form integration snippets
- GitHub issue templates (bug report, feature request) and PR template
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1); CONTRIBUTING expanded with
  issue/PR workflow
- Benchmarks: `packages/id/src/id.bench.ts`, `scripts/throughput.mjs`,
  `BENCHMARKS.md`, and `benchmarks/baseline.json` (`npm run bench` /
  `npm run bench:throughput`)
- Browser playground (`playground/`, `npm run build:playground`), deployed to
  GitHub Pages on push to `main` via `.github/workflows/playground.yml`
- `@idvalidator/data-id-address`: `resolvePostalCode(code)` (postal code
  straight to region names), `searchPostalCodesByName(query, { level, output })` (region name
  -> postal code(s), the reverse), and `searchPlateCodesByArea(query)`
  (area name -> plate region code(s), the reverse of `lookupPlateRegion`)
- **`@idvalidator/global-iban`** (new package, 1.0.0) — IBAN structural
  validation per ISO 13616 with the ISO 7064 mod-97-10 checksum and per-country
  lengths from the SWIFT IBAN Registry (89 official + 22 experimental countries).
  `validate()` (never throws, returns the canonical unspaced/uppercase value),
  `isValid()`, `parse()`, `normalize()`, `format()`, `formatDisplay()`,
  `listCountries()`, `countryInfo()`, plus `options.rejectPartialCountries` for
  consumers that must not accept the registry's experimental entries. Models
  structure only — BBAN field positions and national domestic checksums are
  deliberately out of scope, and the package never claims an account exists
- `@idvalidator/data-id-address`: village-level (desa/kelurahan) support —
  `listVillagesInDistrict`, `searchVillagesByName`, `resolvePostalCodeVillages`
  (all async, lazy-load a separate ~2.5MB/~650KB gzip dataset only when
  actually used), plus `isValidFieldOrder`/`parseFieldsString` helpers.
  Bumped to `1.1.0` (non-breaking). Note: this does **not** reduce
  reverse-lookup ambiguity (7.52% of postal codes genuinely span more than
  one district at any granularity) — see the package README before
  assuming otherwise

### Changed

- License switched from MIT to **Apache-2.0** across the monorepo. Commit
  `e6d8b21` replaced the `LICENSE` file but left every `package.json` still
  declaring `"license": "MIT"`, so the repository had an Apache LICENSE next to
  MIT package metadata — npm would have shown an MIT badge on every package page
  and misrepresented the terms to consumers. All 8 `package.json` files (root +
  7 packages) now declare `Apache-2.0`, and the README license badge is updated.
- Added `NOTICE` (root + a copy in each package, added to each package's `files`
  so it ships in the tarball). Apache-2.0 requires redistributing attribution
  notices, which MIT did not. The NOTICE enumerates the third-party datasets
  the packages bundle and the license each one stays under — the Indonesian
  region/postal data is MIT-licensed by its upstream authors and remains so.

### Fixed


- The CI bundle-size job could not run: it pinned Node 20, but `size-limit@14`
  imports `glob` from `node:fs/promises` (Node 22+) and declares
  `engines.node: ^22.19.0 || ^24.5.0 || >=26`. npm only warns on engine
  mismatch, so the incompatible pair installed silently and failed at runtime.
  That job now uses Node 22, and `npm run size` starts with a capability
  preflight (`scripts/check-size-runtime.mjs`) that reports a wrong-runtime
  error in plain language instead of an opaque SyntaxError from inside
  `size-limit`. The preflight tests for `fs/promises.glob` rather than parsing a
  version string, so it survives Node renumbering the feature again. The library's
  own support floor stays at Node 18 — this is the only place `size-limit` runs,
  and `engine-strict` was rejected because it would fail `npm ci` on the Node
  18/20 matrix entries that install `size-limit` without ever running it
- `npm run size` crashed on every invocation — `.size-limit.js` used
  `module.exports` in a `"type": "module"` package, so the CI bundle-size job
  could never have passed since that gate landed. The config is now ESM, every
  budget was reset to the size size-limit actually reports (several had been
  set at roughly half their real size, so the gate would have failed on a clean
  tree), and the data-update checklist now builds before checking sizes
- `scripts/throughput.mjs` broke `npm run lint`
  couldn't find it in any tsconfig project) — excluded `scripts/**` from
  linting, same as other non-project config files

## [1.0.2] - 2026-09-21

### Changed

- Version bump only — `@idvalidator/core`, `@idvalidator/global-phone`,
  and `@idvalidator/global-email` at `1.0.1` are already published to
  npm and a version number can never be reused once published, so this
  bump was required to ship the `idvalidator-id` rename and the
  `release.yml` `--access public` fix below (both first appear in this
  version, not 1.0.1).
- `id-validator-id` renamed to `idvalidator-id` (to match the `@idvalidator`
  scope rename in 1.0.1). Separately, `id-validator-id` had also become
  blocked as a name: an earlier manual publish/unpublish cycle removed
  every version of it from the registry, which triggers npm's policy
  that a fully-unpublished package name cannot be republished for 28
  days. Renaming sidesteps the wait entirely.

### Changed

- License switched from MIT to **Apache-2.0** across the monorepo. Commit
  `e6d8b21` replaced the `LICENSE` file but left every `package.json` still
  declaring `"license": "MIT"`, so the repository had an Apache LICENSE next to
  MIT package metadata — npm would have shown an MIT badge on every package page
  and misrepresented the terms to consumers. All 8 `package.json` files (root +
  7 packages) now declare `Apache-2.0`, and the README license badge is updated.
- Added `NOTICE` (root + a copy in each package, added to each package's `files`
  so it ships in the tarball). Apache-2.0 requires redistributing attribution
  notices, which MIT did not. The NOTICE enumerates the third-party datasets
  the packages bundle and the license each one stays under — the Indonesian
  region/postal data is MIT-licensed by its upstream authors and remains so.

### Fixed


- `.github/workflows/release.yml`: the `idvalidator-id` (formerly
  `id-validator-id`) publish step was missing `--access public`. This
  isn't optional for a new package when `--provenance` is also used,
  even for an unscoped package (which is otherwise public by default
  without the flag) — npm refuses to generate a provenance attestation
  without an explicit access level. This was the actual cause of the
  first `v1.0.1` release run failing at that step.

## [1.0.1] - 2026-09-20

### Changed

- Scoped packages renamed from `@id-validator/*` to `@idvalidator/*`
  (`@idvalidator/core`, `@idvalidator/global-phone`,
  `@idvalidator/global-email`, `@idvalidator/data-id-address`). The
  `@id-validator` npm organization name became unavailable after being
  deleted and re-registration was blocked by npm's name-reuse hold, with
  no published timeline for release.

### Changed

- License switched from MIT to **Apache-2.0** across the monorepo. Commit
  `e6d8b21` replaced the `LICENSE` file but left every `package.json` still
  declaring `"license": "MIT"`, so the repository had an Apache LICENSE next to
  MIT package metadata — npm would have shown an MIT badge on every package page
  and misrepresented the terms to consumers. All 8 `package.json` files (root +
  7 packages) now declare `Apache-2.0`, and the README license badge is updated.
- Added `NOTICE` (root + a copy in each package, added to each package's `files`
  so it ships in the tarball). Apache-2.0 requires redistributing attribution
  notices, which MIT did not. The NOTICE enumerates the third-party datasets
  the packages bundle and the license each one stays under — the Indonesian
  region/postal data is MIT-licensed by its upstream authors and remains so.

### Fixed


- `idvalidator-id`'s `phone.validate()` could throw a raw `TypeError` on
  non-string input (number, boolean, object, array) instead of returning a
  proper `ValidationResult`. `isValid()` already guarded against this via
  `ensureValidInput()`; `validate()` did not. Found by adversarially
  testing every validator's `validate()`/`isValid()` against the full
  malformed-input matrix (`null`, `undefined`, wrong types, emoji,
  5000-character strings). Fixed by applying the same guard `validate()`
  uses everywhere else in the codebase; `isValid()` simplified to delegate
  to `validate(input).valid`.
- Test suite: 207 tests passing (up from 201), including a new
  `phone.validate (Indonesia-aware) - input safety` test block mirroring
  the one already present in `@idvalidator/global-phone`'s tests.

## [1.0.0] - 2026-09-20

### Initial Release

First public release of the `id-validator` TypeScript monorepo ecosystem.

### Packages

- **`@idvalidator/core`** — Shared types, result/error model (`ValidationResult<T>`, `ValidationError`, `CoreErrorCode`), input normalization primitives, and input safety utilities.
- **`idvalidator-id`** — Indonesian validators: NIK, NPWP, SIM, Passport, Postal Code, License Plate, and Indonesia-aware Phone and Email (re-exported from global modules).
- **`@idvalidator/global-phone`** — International phone validation conforming to ITU-T E.164 with country calling code lookup.
- **`@idvalidator/global-email`** — Structural email validation and parsing (`local@domain.tld`).
- **`@idvalidator/data-id-address`** *(optional)* — Indonesia address reference data: province/regency/district hierarchy (Kepmendagri No. 300.2.2-2430/2025), postal-code reverse index (Kepmendagri No. 300.2.2-3128/2025), and plate region lookup (community-sourced).

### Features

- Domain-first API: `nik.validate()`, `nik.parse()`, `nik.format()`, etc. — consistent across all validators.
- Full dual ESM/CJS build (tsup) with TypeScript declaration files (`.d.ts`/`.d.cts`).
- `nik` — province and regency/city codes checked against real Kemendagri reference data (38 provinces, 514 regencies). District-level code validated as "not 00" in the core package; full name resolution available via `@idvalidator/data-id-address`.
- `npwp` — supports both legacy 15-digit format (heuristic mod-11 checksum) and 16-digit NIK-based format (PMK 112/2022).
- `phone` (`idvalidator-id`) — accepts local Indonesian input (`0812...`, `628...`, with separators) before normalizing to `+62` E.164.
- `postalCode` — structural 5-digit validation; region lookup available via `@idvalidator/data-id-address`.
- `licensePlate` — full parse/format with regional code extraction; area-name lookup available via `@idvalidator/data-id-address`.
- `sim`, `passport` — heuristic structural checks (no consolidated public spec available).
- `email` — practical `local@domain.tld` structural check; safe against emoji and non-ASCII injection.
- Custom error messages via `ValidationOptions.messages` for localization and display overrides.
- Comprehensive input safety across all validators: guards against `null`, `undefined`, non-string types, whitespace-only input, emoji/Unicode injection, and excessively long inputs.
- 201 tests passing across 10 test files (vitest).
- CI on Node.js 18, 20, and 22 (GitHub Actions).
- npm publish provenance attestation via GitHub Actions OIDC (`--provenance`).
