# Reference

Per-validator reference documentation. Each entry should be filled in as the
validator is implemented, following this template:

## `<domain>` (e.g. `nik`)

- **Package:** `id-validator-<cc>`
- **What it validates:** structural/format rules it checks
- **What it does NOT validate:** e.g. existence in a government database
- **Supported formats:** input formats accepted
- **API:** `.validate()`, `.normalize()`, `.parse()`, `.format()` (only the ones implemented)
- **Data sources:** reference dataset(s) used, with version
- **Known limitations:** edge cases not covered

---

<!-- Indonesia (idvalidator-id) -->
## nik
- **API:** `.validate()`, `.normalize()`, `.parse()`, `.format()`
- **What it validates:** 16-digit structure; province and regency/city codes checked against real Kemendagri data (`data/regions.json`, Kepmendagri No. 300.2.2-2430/2025, 38 provinces / 514 regencies — see file for source); district (kecamatan) code only checked as "not 00" in the core validator (no kecamatan-level dataset is bundled here — see `@idvalidator/data-id-address` below for real district-code lookup/validation); day/month-of-birth range (incl. female +40 offset); sequence non-zero
- **What it does NOT validate:** existence in Dukcapil's database; district-level code accuracy in the core package; century of birth year is a heuristic guess
- **Name resolution:** `nik.parse()` returns raw codes only (no names). Pass them to `resolveAddress()` from the optional `@idvalidator/data-id-address` package to get province/regency/district names — and to actually verify the district code, since the core package doesn't.

## npwp
- **API:** `.validate()`, `.normalize()`, `.parse()`, `.format()`
- **What it validates:** legacy 15-digit format via a **heuristic** mod-11 checksum (unofficial, reverse-engineered algorithm — not published by DJP); 16-digit NIK-based format (PMK 112/2022) via `nik.validate()`
- **What it does NOT validate:** that the number is an active, registered NPWP with DJP

## sim
- **API:** `.validate()` only
- **Status:** heuristic — 12-digit length check only; no consolidated public spec exists for SIM numbering
- **Not implemented:** `.normalize()`, `.parse()`, `.format()`

## passport
- **API:** `.validate()`, `.normalize()`
- **Status:** heuristic — 1 letter + 7 digits pattern, based on commonly observed e-passport numbers; no official spec consolidated
- **Not implemented:** `.parse()`, `.format()`

## postalCode
- **API:** `.validate()`, `.normalize()`
- **What it validates:** 5 digits, first digit non-zero
- **Not implemented directly:** `.parse()`, `.format()` — kept out of the core validator so the default bundle stays lean (PRD §18). For real postal->region resolution, use the separate, optional **`@idvalidator/data-id-address`** package: `lookupPostalCode(code)` returns `{ provinceCode, regencyCode, districtCode }[]` (usually one match; ~7.5% of codes genuinely resolve to more than one district). Source: Kepmendagri No. 300.2.2-3128/2025, via github.com/cahyadsn/wilayah_kodepos (MIT).

## licensePlate
- **API:** `.validate()`, `.normalize()`, `.parse()`, `.format()`
- **What it validates:** `[A-Z]{1,2} [1-9]\d{0,3} [A-Z]{0,3}` structural pattern (region, number, series)
- **What it does NOT validate:** that the plate is currently issued/registered
- **Region-code -> area name lookup:** available via the optional `@idvalidator/data-id-address` package's `lookupPlateRegion(code)` — but flagged there as **community-sourced, not official** (unlike every other lookup in that package). Indonesian plate region codes are a Polri/Korlantas assignment with no known official machine-readable open dataset; this table was compiled from public news/automotive articles, which aren't always consistent with each other. Treat matches as a helpful hint, not a verified fact.

## phone (global)
- **API:** `.validate()`, `.normalize()`, `.parse()`, `.format()`
- **What it validates:** E.164 structure (`+` + 8–15 digits) against a known country-calling-code table
- **What it does NOT validate:** that the number is active, assigned, or reachable
- **Note:** this is the country-agnostic global module — it requires an explicit `+<calling code>`. It does NOT guess a country from a bare local number like `08123456789`. `idvalidator-id`'s `phone` (below) wraps this with Indonesia-specific normalization.

## phone (`idvalidator-id`, wraps global `phone`)
- **API:** `.validate()`, `.normalize()`, `.parse()`, `.format()`
- **What it adds over the global module:** accepts common Indonesian input shapes before delegating — `08123456789` (local format), `628123456789` (no leading `+`), and separators (`-`, `.`, spaces, parens) in any of these — normalizing all of them to `+62...` and then running the same E.164 checks as the global module.
- **What it does NOT validate:** same limits as the global `phone` module (not active/assigned/reachable); does not identify whether a normalized number is actually a valid Indonesian mobile prefix (e.g. `8xx`) vs. landline — any digit string long enough after `62` passes.

## email (global)
- **API:** `.validate()`, `.normalize()`, `.parse()`
- **What it validates:** practical `local@domain.tld` structural shape (not full RFC 5322, which is far looser than what real mail providers accept)
- **What it does NOT validate:** that the mailbox exists or accepts mail


---

## Custom Error Messages

All validators support per-call custom error message overrides via an optional `options` parameter.

### Quick Example

```typescript
import { nik } from 'idvalidator-id';

// Use custom messages (e.g., for localization)
const result = nik.validate('123', {
  messages: {
    INVALID_LENGTH: 'Nomor NIK harus 16 digit',
    REQUIRED: 'NIK wajib diisi'
  }
});
```

### ValidationOptions Interface

```typescript
interface ValidationOptions {
  messages?: Record<string, string>;
}
```

All `validate()` functions accept: `validate(input: unknown, options?: ValidationOptions)`

### Resolution Order

1. Per-call custom message (from `options.messages`) — if provided
2. Built-in default message — fallback

### Usage Examples

**Localization:**
```typescript
const indonesianMessages = {
  REQUIRED: 'Wajib diisi',
  INVALID_LENGTH: 'Panjang tidak sesuai',
  INVALID_FORMAT: 'Format tidak valid',
};

nik.validate('123', { messages: indonesianMessages });
```

**Partial Override:**
```typescript
// Override just one message, others use defaults
nik.validate('invalid', {
  messages: { INVALID_LENGTH: 'Custom length message' }
});
```

**See [ERROR-CODES.md](./ERROR-CODES.md) for complete list of error codes.**

### Design Principles

- **No module-level state** — messages passed per call, not configured globally
- **Thread-safe** — no shared mutable state
- **Backward compatible** — options parameter is optional
- **No built-in translations** — library provides mechanism, not translations

### Implementation Status

- **Fully implemented:** NIK, Email validators
- **Pattern documented (apply to remaining):** NPWP, Phone, SIM, Passport, License Plate, Postal Code

Reference implementation: `packages/id/src/nik/index.ts`

---

## isValid() Convenience Wrapper

All validators provide an `isValid()` method that returns a simple boolean:

```typescript
// Instead of:
const result = nik.validate(input);
if (result.valid) { /* ... */ }

// You can use:
if (nik.isValid(input)) { /* ... */ }
```

**Available on all validators:**
- `nik.isValid(input)`
- `npwp.isValid(input)`
- `email.isValid(input)`
- `phone.isValid(input)`
- `sim.isValid(input)`
- `passport.isValid(input)`
- `licensePlate.isValid(input)`
- `postalCode.isValid(input)`

Use `validate()` when you need error details; use `isValid()` for simple boolean checks.
