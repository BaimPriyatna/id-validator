# Architecture

## Overview

id-validator is a TypeScript-based validation ecosystem for structured, country-specific, and global data.

The project is designed around three principles:

- Country-aware: country-specific validators use the terminology, rules, and datasets relevant to each country.
- Shared global functionality: globally applicable validators are implemented once and reused across country packages.
- Independent packages: users can install only the country package they need without depending on unrelated country implementations.

The architecture separates shared functionality, country-specific functionality, validation logic, and reference data.

## Component Diagram

```
                         +----------------------+
                         |       Consumer       |
                         |  Node / Browser / TS  |
                         +-----------+-----------+
                                     |
                                     v
                    +-----------------------------+
                    |      Country Package        |
                    |                             |
                    |  idvalidator-id            |
                    |  id-validator-us            |
                    |  id-validator-my            |
                    |  ...                        |
                    +--------------+--------------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
                 v                                   v
       +----------------------+          +----------------------+
       |  Country Validators  |          |   Global Validators  |
       |                      |          |                      |
       |  NIK                 |          |  Phone               |
       |  NPWP                |          |  Email               |
       |  SIM                 |          |  URL                 |
       |  License Plate       |          |  ...                 |
       |  ...                 |          |                      |
       +-----------+----------+          +-----------+----------+
                   |                                 |
                   +-----------------+---------------+
                                     |
                                     v
                       +------------------------+
                       |      Core / Shared     |
                       |                        |
                       |  Types                 |
                       |  Results               |
                       |  Errors                |
                       |  Normalization         |
                       |  Common utilities      |
                       +-----------+------------+
                                   |
                                   v
                       +------------------------+
                       |     Reference Data     |
                       |                        |
                       |  Country codes         |
                       |  Region codes          |
                       |  Postal data           |
                       |  Other datasets        |
                       +------------------------+
```

## Package Structure

The repository uses a package-oriented architecture.

```
packages/
├── core/
├── global/
├── id/
├── us/
├── my/
├── sg/
└── ...
```

The exact package names may evolve, but the architectural responsibilities remain the same.

### Core

The core package contains functionality shared by validators and country packages, including:

- common TypeScript types
- validation result types
- error definitions
- normalization primitives
- shared validation utilities
- common interfaces

Core must remain independent from individual countries:

```
Country package
      |
      v
    Core
```

Core must not depend on a country package.

## Global Validators

Global validators represent data types that are not inherently tied to a single country, for example:

- phone numbers
- email addresses
- URLs
- other globally applicable structured data

Global validators are implemented independently so that country packages can reuse them:

```
global/phone
       |
       +-- idvalidator-id
       +-- id-validator-us
       +-- id-validator-my
       +-- id-validator-sg
```

A country package may expose relevant global validators as part of its public API. This lets a user install one country package while still having access to commonly required global functionality.

## Country Packages

Each country package contains validators and data specific to that country, for example:

```
idvalidator-id
├── NIK
├── NPWP
├── SIM
├── License Plate
└── (relevant global validators)
```

A country package should not contain unrelated country logic. Indonesian-specific rules belong to `idvalidator-id`; United States-specific rules belong to `id-validator-us`.

Country packages may depend on:

```
Country Package
      |
      +-- Core
      +-- Global
```

Country packages must not depend directly on another country's package.

## Validator Architecture

Validators follow a consistent public API while allowing their internal implementation to differ according to the data type. The preferred interface is domain-oriented:

```ts
nik.validate(...)
nik.parse(...)
nik.format(...)

phone.validate(...)
phone.parse(...)
phone.format(...)
```

The library avoids exposing overly generic top-level functions such as `validate(...)`, `parse(...)`, `format(...)` as the primary API. This reduces naming conflicts in consumer applications and keeps the API associated with the data type being operated on.

## Validation Pipeline

Where applicable, structured data follows a conceptual pipeline:

```
Input
  |
  v
Normalize
  |
  v
Validate
  |
  v
Parse
  |
  v
Format
```

Not every validator implements every stage:

- A validator may only support `validate()`.
- A structured identifier may support `validate()` and `parse()`.
- A value with multiple supported representations may also provide `format()`.

The public API exposes only operations that are meaningful for the specific data type.

## Validation vs Verification

id-validator performs local validation, not authoritative verification. Validation determines whether input conforms to supported structural and semantic rules:

```
Input
  |
  v
Does the value follow the supported format?
        |
        +-- Yes
        +-- No
```

It does not establish whether the identifier:

- actually exists in a government database
- belongs to a particular person
- is currently active
- has been officially issued
- is currently registered

External verification services, when required, are outside the responsibility of the core library.

## Reference Data

Some validators require reference data rather than only algorithms, for example:

- regional codes
- administrative codes
- postal codes
- license plate prefixes
- country-specific reference information

Reference data is treated separately from validation logic:

```
Validator
    |
    +-- uses --> Reference Data
```

This separation allows datasets to be updated without unnecessarily changing the validator architecture. Reference data should have identifiable versions and sources where applicable.

## Data and Code Separation

Country-specific rules and reference datasets are not embedded directly into generic validation utilities:

```
Validation Logic
       |
       +-- consumes --> Country Data
```

This keeps the system easier to maintain when official formats or reference data change, and makes changes to data distinguishable from changes to validation behavior.

## Dependency Direction

Dependencies flow toward shared abstractions:

```
Country Packages
      |
      +---------- Global
      |
      +---------- Core
                       ^
                       |
                 Shared Utilities
```

The following dependency patterns are not allowed:

```
Core -----> Country Package         (not allowed)
idvalidator-id --> id-validator-us (not allowed)
Country A --> Country B             (not allowed)
```

Country packages must remain independently maintainable.

## Public and Internal APIs

Each package distinguishes between its public API and internal implementation:

```
Package
├── public exports
└── internal implementation
```

Only intentionally supported APIs are exported from the package entry point. Internal implementation details may change without being treated as a public API change. This allows the implementation to evolve while maintaining a stable developer-facing interface.

## Runtime Characteristics

The library is designed to be:

- local-first
- deterministic
- TypeScript-first
- usable in Node.js and browser environments where supported
- free from unnecessary network requirements
- suitable for tree-shaking
- explicit about validation limitations

Validation does not require sending user input to a remote service by default. This is particularly important because identifiers and personal data may be sensitive.

## Error Model

Validation failures use structured, machine-readable errors rather than relying only on human-readable strings:

```ts
type ValidationResult<T = unknown> = {
  valid: boolean
  errors: ValidationError[]
  value?: T
}
```

Errors contain stable codes that applications can use programmatically. Human-readable messages may change without necessarily changing the semantic error code.

## Country Expansion

Adding a new country does not require modifying unrelated country packages:

```
packages/
├── core/
├── global/
├── id/
├── us/
├── my/
├── sg/
└── new-country/
```

A new country package integrates through the existing shared interfaces and conventions. Adding one country remains isolated from the implementation of other countries.

## Design Principles

1. **One API style, many countries.** Country-specific implementations may have different rules, but the overall developer experience remains consistent.
2. **Country terminology matters.** The library uses the terminology developers actually encounter in each country (`nik`, `npwp`, `sim`), rather than replacing every identifier with a generic name such as `id`.
3. **Shared functionality is not duplicated.** Global validators have a shared implementation rather than being independently reimplemented in every country package.
4. **Validation is not verification.** The library clearly distinguishes structural validation from authoritative verification.
5. **Public APIs remain intentional.** Not every internal utility becomes part of the public API.
6. **Data is maintainable independently.** Reference datasets are separable from validation logic where practical.
7. **Privacy by default.** Validation happens locally whenever possible and does not transmit user input to external services by default.

## Architecture Evolution

The architecture supports additional countries, validators, and reference datasets without requiring a redesign of the entire system. The primary extension points:

```
New global validator
        |
        v
      Global
        |
        +--> Country packages

New country
        |
        v
Country package
        |
        +--> Core
        +--> Global

New reference dataset
        |
        v
Country / Validator data
```

Architectural changes preserve the separation between:

- shared core functionality
- global validators
- country-specific validators
- reference data
- public APIs
- internal implementation

---

## Compatibility & Packaging

### Tree-Shaking

**Status:** VERIFIED

All packages configured with `"sideEffects": false` and proper ES module exports:

| Import Pattern | Bundle Size | Included Modules |
|----------------|-------------|------------------|
| Full package | ~8.2 KB | All validators + core |
| Single validator (`import { nik }`) | ~1.8 KB | NIK only + core types |
| Two validators | ~2.4 KB | Selected + core |

**Verification:** Tree-shaking eliminates unused validators. Only imported code is bundled.

### Runtime Compatibility

**Node.js:** TESTED
- Official support: Node.js 18+
- CI tested: 18.x, 20.x, 22.x
- Required features: ES2022, ESM, CJS interop

**Browser:** UNTESTED (expected compatible)
- No Node.js-specific APIs used
- Pure JavaScript + TypeScript
- Requires ES2022 support
- Should work with Webpack, Vite, Rollup

**Bun:** UNTESTED (expected compatible)
- ESM modules (Bun has excellent ESM support)
- No Node.js-specific APIs

**Deno:** UNTESTED (may require adjustments)
- May need explicit file extensions in imports
- May need `npm:` prefix for dependencies

**Edge Runtimes:** UNTESTED (expected compatible)
- No Node.js APIs or file system access
- Consider bundle size limits (~1MB typical)

### Package Format

**Dual Package (ESM + CJS):** VERIFIED

```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

Both ESM (`import`) and CommonJS (`require`) work correctly.

### TypeScript Support

**Status:** VERIFIED
- TypeScript 5.6+
- Full `.d.ts` declarations
- Source maps for debugging
- Strict mode enabled
- Full type inference

### Bundler Compatibility

| Bundler | Status | Notes |
|---------|--------|-------|
| tsup | VERIFIED | Used for building packages |
| Rollup | VERIFIED | Tree-shaking tests passed |
| Webpack | UNTESTED | Should work (standard ESM) |
| Vite | UNTESTED | Should work (uses Rollup) |
| esbuild | UNTESTED | Should work (used by tsup) |
