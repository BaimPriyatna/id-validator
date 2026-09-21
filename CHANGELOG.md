# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-09-20

### Changed

- Scoped packages renamed from `@id-validator/*` to `@idvalidator/*`
  (`@idvalidator/core`, `@idvalidator/global-phone`,
  `@idvalidator/global-email`, `@idvalidator/data-id-address`). The
  `@id-validator` npm organization name became unavailable after being
  deleted and re-registration was blocked by npm's name-reuse hold, with
  no published timeline for release.
- The main package renamed from `id-validator-id` to `idvalidator-id`
  (for consistency with the scope rename above). Separately, that name
  became blocked too: an earlier manual publish/unpublish cycle removed
  every version of `id-validator-id` from the registry, which triggers
  npm's policy that a fully-unpublished package name cannot be
  republished for 28 days. Renaming avoided the wait. Nothing under
  either old name (`@id-validator/*` or `id-validator-id`) is depended on
  by any real consumer, so neither rename is a breaking change.

### Fixed

- `.github/workflows/release.yml`: the `idvalidator-id` publish step was
  missing `--access public`. This isn't optional for a new package when
  `--provenance` is also used, even for an unscoped package (which is
  otherwise public by default without the flag) — npm refuses to
  generate a provenance attestation without an explicit access level.
  This was the actual cause of the release workflow failing at that step.
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
