# idvalidator-id

Validators for Indonesia-specific structured data, plus the global
Phone/Email validators, following the id-validator ecosystem's domain-first
API: `domain.validate()`, `.normalize()`, `.parse()`, `.format()` (only
where meaningful for that data type).

```bash
npm install idvalidator-id
```

## Important

A `valid: true` result means the input matches the known structural rules
this library implements. It does **not** confirm the identifier exists,
is currently active, or is officially registered with any government
system (Dukcapil, DJP, DMV, etc.). See the root [ARCHITECTURE.md](https://github.com/BaimPriyatna/id-validator/blob/main/ARCHITECTURE.md)
and [REFERENCE.md](https://github.com/BaimPriyatna/id-validator/blob/main/REFERENCE.md) for the full validation-vs-verification scope and
per-validator limitations.

## Usage

Framework integrations (Express, Zod, React): see the repo
[EXAMPLES.md](https://github.com/BaimPriyatna/id-validator/blob/main/EXAMPLES.md).

```ts
import { nik, npwp, phone, postalCode, licensePlate, sim, passport } from "idvalidator-id";

nik.validate("3171051708900001");
// { valid: true, errors: [], value: "3171051708900001" }

nik.parse("3171051708900001");
// { provinceCode: "31", regencyCode: "71", districtCode: "05",
//   birthDate: "1990-08-17", gender: "male", sequence: "0001" }
// For real province/regency/district names, pass these codes to
// resolveAddress() from the optional @idvalidator/data-id-address package.

npwp.format("012345674000000");
// "01.234.567.4-000.000"

phone.validate("+62 812-3456-789");
// { valid: true, errors: [], value: "+628123456789" }

phone.validate("08123456789");        // local format, also accepted
phone.validate("0812-3456-789");      // with separators, also accepted
// both -> { valid: true, errors: [], value: "+628123456789" }

postalCode.validate("40115");
// { valid: true, errors: [], value: "40115" }

// Optional: province/regency/district lookup for a postal code
// npm install @idvalidator/data-id-address
// import { lookupPostalCode } from "@idvalidator/data-id-address";
// lookupPostalCode("40115"); // [{ provinceCode: "32", regencyCode: "73", districtCode: "09" }]

licensePlate.format("b1234xyz");
// "B 1234 XYZ"

sim.validate("123456789012");     // heuristic 12-digit check
passport.validate("C1234567");    // heuristic 1-letter + 7-digit check
```

## What's implemented

| Validator | validate | normalize | parse | format | Status |
| --- | :-: | :-: | :-: | :-: | --- |
| `nik` | yes | yes | yes | yes | stable |
| `npwp` | yes | yes | yes | yes | stable (legacy checksum is heuristic — see REFERENCE.md) |
| `phone` (global) | yes | yes | yes | yes | stable |
| `licensePlate` | yes | yes | yes | yes | stable |
| `postalCode` | yes | yes | – | – | region lookup available via optional `@idvalidator/data-id-address` package |
| `sim` | yes | – | – | – | heuristic (no consolidated public spec) |
| `passport` | yes | yes | – | – | heuristic (no consolidated public spec) |
| `email` (global) | yes | yes | yes | – | stable |

Full per-validator documentation: [REFERENCE.md](https://github.com/BaimPriyatna/id-validator/blob/main/REFERENCE.md) at the repo root.
