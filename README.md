<p align="center">
  <em>Type-safe validation, normalization, parsing, and formatting for country-specific and global structured data</em>
</p>

[![CI](https://github.com/BaimPriyatna/id-validator/actions/workflows/ci.yml/badge.svg)](https://github.com/BaimPriyatna/id-validator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Version](https://img.shields.io/badge/version-1.0.2-informational.svg)](CHANGELOG.md)

One API style. Many countries. Local validation. No network.

```bash
npm install idvalidator-id
```

```ts
import { nik, npwp, phone, postalCode, licensePlate } from "idvalidator-id";

const result = nik.validate(input);
if (result.valid) {
  // ...
}
```

---

## Table of Contents

- [Important](#important)
- [Architecture](#architecture)
- [Packages](#packages)
- [Status (v1)](#status-v1)
- [Framework examples](#framework-examples)
- [Performance](#performance)
- [Requirements](#requirements)
- [Development](#development)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Compatibility](#compatibility)
- [Roadmap](#roadmap)
- [License](#license)

---

## Important

> [!IMPORTANT]
> A successful validation means the input matches the known structural
> rules this library implements. It does **not** confirm that the
> underlying identifier exists, is currently active, or is officially
> registered with any government or authority (Dukcapil, DJP, DMV, etc.).
> Official verification is out of scope by design — see
> [ARCHITECTURE.md](./ARCHITECTURE.md) ("Validation vs Verification").

---

## Architecture

```
                    ID Validator
                         │
                 @idvalidator/core
                         │
            ┌────────────┴────────────┐
            │                         │
       Global Rules              Country Rules
            │                         │
      ┌─────┼─────┐            ┌──────┼──────┐
      │     │     │            │      │      │
    Phone Email  ...           ID     US     ...
                               │      │
                              NIK    SSN
                              NPWP   EIN
                              ...    ...
```

- **Country-aware** — each country package (`id-validator-<cc>`) uses the
  terminology and rules developers actually encounter there (`nik`,
  `npwp`, not a generic `nationalId`).
- **Shared global rules** — data that isn't tied to one country (phone,
  email) is implemented once in `packages/global/*` and reused across
  country packages.
- **Independent packages** — installing `idvalidator-id` doesn't pull in
  unrelated countries, and country packages never depend on each other.

Full design rationale, the validation pipeline, and the error model are in
[ARCHITECTURE.md](./ARCHITECTURE.md). Per-validator behavior,
what each one does and does **not** check, is in
[REFERENCE.md](./REFERENCE.md).

---

## Packages

| Package | Scope |
| --- | --- |
| `@idvalidator/core` | Shared types, result/error model, normalization primitives |
| `idvalidator-id` | Indonesia: NIK, NPWP, SIM, Passport, Postal Code, License Plate, Phone, Email |
| `@idvalidator/global-phone` | E.164 phone validation, reused by every country package |
| `@idvalidator/global-email` | Structural email validation, reused by every country package |
| `@idvalidator/data-id-address` *(optional)* | Indonesia province/regency/district/postal/plate-region reference data — see [Known Limitations](#known-limitations) |

---

## Status (v1)

| Domain | Status |
| --- | --- |
| `nik`, `npwp`, `phone`, `licensePlate` | fully implemented — validate/normalize/parse/format. `nik` checks province/regency codes against real Kemendagri data. |
| `postalCode` | validate/normalize only — see `@idvalidator/data-id-address` (optional) for province/regency/district lookup |
| `sim`, `passport` | heuristic validate-only (no consolidated public spec) |
| `email` (global) | fully implemented — validate/normalize/parse |

---

## Framework examples

Copy-paste integrations for Express (middleware), Zod (`.refine()` /
`.superRefine()`), and React (form validation):

→ **[EXAMPLES.md](./EXAMPLES.md)**

---

## Performance

On a typical developer laptop (Node 22, Windows x64), validating **100,000**
structurally valid NIKs takes on the order of **~100 ms** (~1M ops/sec).
Full table, methodology, and how to re-run / compare baselines:

→ **[BENCHMARKS.md](./BENCHMARKS.md)**

```bash
npm run build && npm run bench:throughput   # 100k wall-clock table
npm run bench                               # Vitest + Tinybench
```

---

## Requirements

- Node.js 18 or newer
- npm (workspaces-based monorepo)

---

## Development

```bash
npm install
npm run build      # builds all packages (dual ESM/CJS + .d.ts via tsup)
npm test           # vitest, all packages
npm run typecheck  # tsc --noEmit per package
npm run bench      # performance (see BENCHMARKS.md)
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for adding a validator, opening
issues/PRs, and cutting a release. Community norms are in
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

## Project Structure

```
id-validator/
├── README.md
├── EXAMPLES.md           # Express / Zod / React integration snippets
├── BENCHMARKS.md         # Throughput numbers + how to re-run / compare
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── ARCHITECTURE.md
├── ERROR-CODES.md
├── REFERENCE.md
├── SECURITY.md
├── LICENSE
├── benchmarks/           # Vitest bench baseline JSON for --compare
├── scripts/              # e.g. throughput.mjs
├── .github/
│   ├── ISSUE_TEMPLATE/   # bug + feature issue forms
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/        # CI (test) and release (publish) pipelines
└── packages/
    ├── core/                     # @idvalidator/core
    ├── global/
    │   ├── phone/                # @idvalidator/global-phone
    │   └── email/                # @idvalidator/global-email
    ├── id/                       # idvalidator-id
    └── data-id-address/          # @idvalidator/data-id-address (optional)
```

---

## Known Limitations

- `postalCode`, `sim`, and `passport` don't have `.parse()`/`.format()` in
  the core package — see the [Status](#status-v1) table and
  [REFERENCE.md](./REFERENCE.md) for why (bundle-size budget, or no official spec to
  validate against).
- `@idvalidator/data-id-address`'s province/regency/district/postal data
  is sourced from official, MIT-licensed Kemendagri-aligned datasets. Its
  vehicle plate region-code lookup (`lookupPlateRegion`) is the one
  exception: it's **community-sourced, not official**, since no
  machine-readable Korlantas/Polri dataset is known to exist.
- **Tree-shaking works at the package level only, not per-validator.**
  `idvalidator-id` bundles all of its validators into a single
  `dist/index.js`. Importing just one validator (e.g. `import { postalCode }
  from "idvalidator-id"`) does not let a bundler (esbuild, webpack, etc.)
  exclude another validator's code or data from the final bundle —
  verified empirically: a bundle built from `postalCode` alone still
  included `nik`'s ~30 KB province/regency dataset. Planned fix:
  per-validator subpath exports (e.g. `idvalidator-id/nik`). Until then,
  expect the full `idvalidator-id` bundle size (~62 KB minified) regardless
  of which validators you actually use.
- Only Indonesia (`idvalidator-id`) is implemented so far.

---

## Compatibility

| Environment | Status |
| --- | --- |
| Node.js 18 / 20 / 22 | Tested — CI runs the full test suite on all three every push ([`ci.yml`](.github/workflows/ci.yml)) |
| TypeScript | Tested — `tsc --noEmit` per package in CI; full `.d.ts`/`.d.cts` shipped |
| ESM | Tested — package `type: module`, ESM build exercised by the test suite and manual smoke tests |
| CommonJS | Tested — dual `.cjs` build, manually verified with `require()` |
| Browser | Tested via [jsdom](https://github.com/jsdom/jsdom) (a simulated DOM environment, not a full browser engine) — all validators load and run correctly with no Node-only APIs used (confirmed by both static analysis and the jsdom run). **Not tested in a real browser** (Chrome/Firefox/Safari) — if you hit an issue there, please open an issue. |
| Bun | **Untested.** No network access to install Bun in this project's CI/dev sandbox at time of writing. Code uses no Bun-specific or Node-only APIs, so it's likely to work, but this is not verified. |
| Deno | **Untested**, same reason as Bun. |

---

## Roadmap

See [`CHANGELOG.md`](CHANGELOG.md) for full version history. Not yet
started, per the original PRD: additional country packages
(`id-validator-us`, `-my`, `-sg`, ...), further global modules (IBAN,
SWIFT/BIC, currency), and per-validator subpath exports for real
tree-shaking (see Known Limitations above).

---

## License

MIT — see [LICENSE](LICENSE).
