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

## Large Dataset Handling: Async + Lazy-Load Pattern

**Problem:** Some reference datasets are too large to bundle unconditionally. For example, village-level (desa/kelurahan) address data for Indonesia is ~2.5 MB raw / ~650 KB gzipped. Bundling it with every import penalizes users who never need that granularity.

**Solution:** Async lazy-loading via dynamic `import()`. The dataset is:
- Stored as a separate JSON module
- Imported dynamically only when a function explicitly requiring it is called
- Never loaded if the user stays at coarser granularity (e.g. district-level lookups)

### When to Use This Pattern

Use async lazy-loading when:
1. **Dataset is substantially larger** than the rest of the package (>500 KB raw, or >3× the base package size)
2. **Feature is optional** — most users can accomplish their task without it
3. **Clear API boundary** — async functions can be separated from sync ones without breaking the mental model

Do NOT use this pattern when:
- Dataset is small enough to bundle without concern (< 100 KB gzipped)
- Feature is core functionality used by majority of consumers
- Async/sync split would confuse the API (e.g., `validate()` being async-sometimes-sync depending on options)

### Implementation Guidelines

**1. Separate the large dataset:**

```
packages/data-id-address/
├── data/
│   ├── admin-hierarchy.json        (bundled, ~30 KB — always needed)
│   └── village-postal-index.json   (lazy, ~650 KB — optional)
└── src/
    ├── index.ts                     (sync API, imports admin-hierarchy)
    └── village.ts                   (async API, dynamic import of village data)
```

**2. Export async functions that trigger the load:**

```ts
// village.ts
let villageData: VillageDataset | null = null;

async function loadVillageData(): Promise<VillageDataset> {
  if (villageData) return villageData;
  // Dynamic import — this line triggers the load
  villageData = await import("../data/village-postal-index.json");
  return villageData;
}

export async function listVillagesInDistrict(
  provinceCode: string,
  regencyCode: string,
  districtCode: string
): Promise<Village[]> {
  const data = await loadVillageData();
  return data.villages[`${provinceCode}${regencyCode}${districtCode}`] || [];
}
```

**3. Provide a fast path that never loads the dataset:**

If an API accepts options that *might* need the large dataset but often don't, check the options before loading:

```ts
export async function searchByName(
  query: string,
  options: { fields?: AdminField[] }
): Promise<Result[]> {
  const fields = options.fields || ["district"];
  
  // Fast path: if fields doesn't include "village", never load village data
  if (!fields.includes("village")) {
    return searchDistrictLevel(query); // sync lookup, no dynamic import
  }
  
  // Slow path: user explicitly asked for village-level data
  const data = await loadVillageData();
  return searchWithVillages(query, data);
}
```

**4. Document the async boundary clearly:**

In README/API docs:
- Mark which functions are async and why
- Explain the bundle-size tradeoff
- Show when the dataset is/isn't loaded

Example from `@idvalidator/data-id-address`:

> ### Village-level (desa/kelurahan) — async, lazy-loaded
>
> Everything above resolves down to district (kecamatan) level and loads
> eagerly with the rest of this package. Three more functions go one level
> deeper, to individual desa/kelurahan — but the dataset behind them is
> ~2.5 MB raw / ~650 KB gzipped, so it's dynamically `import()`-ed only when
> actually needed, not bundled with everything else. **These are the only
> async functions in this package** — everything above stays synchronous,
> and calls that don't ask for village-level data never trigger the load at
> all.

**5. Test the lazy-load behavior:**

Verify the fast path never loads the dataset:

```ts
// village.test.ts
describe("lazy-load: fast path never loads village dataset", () => {
  const specifier = "../data/village-postal-index.json";
  
  beforeEach(() => {
    // Clear module cache
    vi.resetModules();
  });
  
  it("searchByName with fields excluding 'village' never imports dataset", async () => {
    const importSpy = vi.spyOn(await import("node:module"), "createRequire");
    
    await searchByName("Jakarta", { fields: ["province", "district"] });
    
    expect(importSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(specifier)
    );
  });
});
```

### Canonical Example

**Reference implementation:** `@idvalidator/data-id-address` (`packages/data-id-address/`)

- Sync API (index.ts): province/regency/district lookups, postal code reverse index — ~30 KB bundled
- Async API (village.ts): village-level (desa/kelurahan) data — ~650 KB, lazy-loaded
- Functions: `listVillagesInDistrict()`, `searchVillagesByName()`, `resolvePostalCodeVillages()`
- Fast path: `searchVillagesByName(..., { fields: ["district"] })` never loads village data even though the function signature is async

This pattern lets users who need only district-level address resolution pay ~30 KB, while users who need complete village granularity pay ~680 KB total, loaded on-demand.

### Pattern for Other Countries

If another country needs similar functionality (e.g., US ZIP code → city/county with a large dataset):

1. Keep the base validators + lightweight reference data synchronous
2. Put the large dataset in a separate JSON file
3. Export async functions from a separate module (e.g., `us-postal-extended.ts`)
4. Use dynamic `import()` with memoization
5. Provide fast-path options that bypass the load when possible
6. Document the async boundary and bundle-size tradeoff clearly

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
- explicit about validation limitations

Tree-shaking works at the **package** level (installing only `id-validator-id` doesn't pull in an unrelated country's package) but not yet at the **per-validator** level within a country package: because each country package's build currently bundles all of its validators into a single `dist/index.js`, importing just one validator (e.g. `postalCode`) does not let a consumer's bundler exclude another validator's code or reference data (e.g. `nik`'s ~30 KB province/regency dataset) from the final bundle. This has been verified empirically with esbuild, not just assumed. See `README.md`'s "Known Limitations" for details and the planned fix (per-validator subpath exports).

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
