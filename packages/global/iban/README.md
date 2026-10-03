# @idvalidator/global-iban

IBAN validation per **ISO 13616** (structure) and **ISO 7064 mod-97-10**
(checksum), with per-country lengths from the SWIFT IBAN Registry.

## Install

```bash
npm install @idvalidator/global-iban
```

## Usage

```ts
import { iban } from "@idvalidator/global-iban";

iban.validate("DE89370400440532013000");
// { valid: true, errors: [], value: "DE89370400440532013000" }

iban.parse("de89 3704 0044 0532 0130 00");
// {
//   countryCode: "DE",
//   countryName: "Germany",
//   checkDigits: "89",
//   bban: "370400440532013000",
//   isSepa: true
// }

iban.formatDisplay("DE89370400440532013000");
// "DE89 3704 0044 0532 0130 00"
```

## API

| Function | Returns | Notes |
| --- | --- | --- |
| `validate(input, options?)` | `ValidationResult<string>` | Never throws; `value` is the canonical (unspaced, uppercase) IBAN |
| `isValid(input, options?)` | `boolean` | Delegates to `validate()` |
| `parse(input)` | `ParsedIban` | Throws on invalid input |
| `normalize(input)` | `string` | Strips spaces/dashes, uppercases |
| `format(input)` | `string` | Canonical electronic form, no spaces |
| `formatDisplay(input)` | `string` | Groups into fours |
| `listCountries()` | `IbanCountry[]` | Official entries first, then experimental |
| `countryInfo(code)` | `IbanCountry \| null` | Registry metadata for one country |

### `options.rejectPartialCountries`

The registry lists some countries as **Partial IBAN Countries
(Experimental)** — 22 of them as of the 2026-05 registry, including Morocco,
Iran and Tunisia. They are accepted by default (those IBANs are structurally
real and checksum-correct), but a strict consumer can reject them:

```ts
iban.validate("MA64011519000001205000534921");
// valid: true  (default)

iban.validate("MA64011519000001205000534921", { rejectPartialCountries: true });
// valid: false, errors[0].code === "PARTIAL_COUNTRY"
```

### Error codes

`REQUIRED`, `INVALID_TYPE`, `INVALID_LENGTH`, `INVALID_FORMAT`,
`INVALID_CHECKSUM` (from `@idvalidator/core`), plus
`UNKNOWN_COUNTRY_CODE` and `PARTIAL_COUNTRY`.

Custom messages: `iban.validate(input, { messages: { INVALID_CHECKSUM: "..." } })`.

## What this does NOT validate

An IBAN passing `validate()` is **not** proof the account exists, is open, or
can receive money. The checksum detects transcription errors, not validity.

This package models **structure only**: country code, total length, and the
mod-97-10 checksum. It deliberately does **not** model BBAN field positions —
the bank identifier, branch code and account number sit at different offsets in
every country, and those are defined per-bank in national bank directories, not
by ISO 13616. `ParsedIban.bban` is therefore the BBAN as an opaque string.

Some countries additionally require a **national check digit** or a
**domestic account-number checksum** beyond mod-97 (e.g. France's RIB key,
Belgium's trailing BBAN check, Spain's local control digits). Those are not
verified here.

## Data

`data/iban-countries.json` — 89 official + 22 partial country entries, each with
country code, name, total IBAN length, SEPA membership, and the registry's own
example IBAN.

Source: <https://www.iban.com/structure>, compiled from the SWIFT IBAN Registry
(ISO 13616); that page states its data was updated 8 May 2026. Every declared
length was cross-checked against that country's example IBAN on the same page
(the registry `meta.note` records this).

Registry data changes as countries join the IBAN standard. Re-verify lengths
against the current registry before trusting this dataset for a compliance
decision; the source and version live in the file's `meta` block.

## License

MIT — see [LICENSE](../../LICENSE).

Registry facts are used from SWIFT/iban.com; see that page's terms on reuse and
attribution.
