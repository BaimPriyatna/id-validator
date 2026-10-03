# @idvalidator/global-currency

ISO 4217 currency reference data: code validation, minor-unit precision, and
conversion between major units and minor units (cents, fils, sen).

## Install

```bash
npm install @idvalidator/global-currency
```

## Usage

```ts
import { currency } from "@idvalidator/global-currency";

currency.validate("usd");
// { valid: true, errors: [], value: "USD" }

currency.info("USD");
// {
//   code: "USD", name: "US Dollar", numeric: "840",
//   minorUnits: 2, isFund: false,
//   countries: ["AMERICAN SAMOA", "BONAIRE, ...]   // 19 territories
// }

currency.toMinorUnits(12.3, "USD");   // 1230
currency.fromMinorUnits(1230, "USD"); // 12.3
```

## Why minor units matter

Payment APIs take integers in the currency's **minor unit**, and the exponent
is *not* the same for every currency. Assuming 2 decimals is a 100x error in
Japan and a 10x error in Kuwait.

| Minor units | Count | Examples |
| --- | --- | --- |
| 0 | 17 | `JPY`, `KRW`, `VND`, `ISK`, `CLP`, `XOF`, `XAF` |
| 2 | 139 | `USD`, `EUR`, `GBP`, `IDR`, `AUD` |
| 3 | 7 | `BHD`, `KWD`, `JOD`, `OMR`, `TND`, `IQD`, `LYD` |
| 4 | 2 | `CLF`, `UYW` (units of account, not tender) |
| `null` | 13 | `XAU`, `XDR`, `XXX` — no defined minor unit |

```ts
currency.toMinorUnits(1000, "JPY");   // 1000  — yen has no fractional part
currency.toMinorUnits(1, "KWD");      // 1000  — 3 decimals
currency.toMinorUnits(1.234, "USD");  // throws — USD has 2
```

`toMinorUnits()` **throws rather than silently rounding** an amount with more
precision than the currency uses. Rounding is how 1.239 USD becomes a cent off.

## API

| Function | Returns | Notes |
| --- | --- | --- |
| `validate(input, options?)` | `ValidationResult<string>` | Never throws; `value` is the uppercase code |
| `isValid(input, options?)` | `boolean` | Delegates to `validate()` |
| `normalize(input)` | `string` | Trims and uppercases |
| `info(code)` | `Currency \| null` | Full registry entry |
| `infoByNumeric(code)` | `Currency \| null` | By 3-digit numeric code, as used in ISO 8583 DE49 / card data; accepts `"048"` or `48` |
| `listCurrencies()` | `Currency[]` | Every entry in the list |
| `minorUnits(code)` | `number \| null \| undefined` | `undefined` = unknown code, `null` = no defined minor unit |
| `hasMinorUnits(code)` | `boolean \| null` | `null` for an unknown code |
| `isFundCode(code)` | `boolean` | ISO 4217 units of account / fund codes |
| `toMinorUnits(amount, code)` | `number` | Throws on excess precision or a code with no minor unit |
| `fromMinorUnits(amount, code)` | `number` | Inverse; requires an integer input |
| `registryMeta` | `Iso4217Meta` | Source, version and publication date of the bundled list |

### Error codes

`REQUIRED`, `INVALID_TYPE`, `INVALID_LENGTH`, `INVALID_FORMAT` (from
`@idvalidator/core`), plus `UNKNOWN_CURRENCY`.

## What this does NOT do

**No exchange rates.** Nothing here converts one currency to another, and a
valid code says nothing about what a currency is worth. Rate data changes
continuously and needs a licensed or live source; bundling a stale copy would
be worse than having none.

A valid code also does not mean the currency is legal tender anywhere, in
circulation, or even still issued — ISO 4217 keeps retired currencies in a
separate historical list (List Three), which is not bundled here.

## Data

`data/iso4217.json` — 178 codes from **ISO 4217 List One** (currency, fund and
precious-metal codes), parsed directly from the official XML.

Source: SIX Financial Information, the ISO 4217 Maintenance Agency —
<https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html>.
The bundled copy declares `Pblshd="2026-09-17"` in its `meta.version`.

Notes on the data:

- `countries` lists every territory the standard assigns a code to, so `EUR`
  has 37 and `XOF` has 8.
- `minorUnits` is `null` where the source says `N.A.` — precious metals, `XDR`,
  `XXX` and similar. Those have no defined precision; the conversion helpers
  reject them rather than guessing.
- `isFund` marks units of account / fund codes (`CLF`, `UYW`, `XAD`, …), which
  are not circulating tender.
- Territories listed as "No universal currency" (Antarctica and two others)
  carry no code in the standard and are intentionally absent.

Re-check against a current List One release before relying on this dataset for
a compliance decision; the publication date is in `meta.version`.

## License

MIT — see [LICENSE](../../LICENSE). ISO 4217 data is published by SIX Financial
Information; ISO permits free use of the country, currency and language code
standards.
