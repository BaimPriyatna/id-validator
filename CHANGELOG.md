# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

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
  straight to region names), `searchPostalCodesByName(query)` (region name
  -> postal code(s), the reverse), and `searchPlateCodesByArea(query)`
  (area name -> plate region code(s), the reverse of `lookupPlateRegion`)

### Fixed

- `scripts/throughput.mjs` broke `npm run lint` (ESLint typed-linting
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
