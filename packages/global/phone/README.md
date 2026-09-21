# @idvalidator/global-phone

International phone number validator conforming to ITU-T E.164 standards and ISO country calling codes.

```bash
npm install @idvalidator/global-phone
```

This package validates, normalizes, parses, and formats international phone numbers. It is used as the global phone validation engine across country packages in the `id-validator` ecosystem, but can also be used as a standalone international phone validator.

---

## Features

- **ITU-T E.164 Compliant**: Validates international numbers starting with `+` up to 15 digits.
- **Calling Code Table Matching**: Validates against real ITU assigned country calling codes (e.g. `+1`, `+62`, `+44`, `+81`, etc.).
- **Input Safety**: Guards against non-ASCII characters, emojis, and excessively long inputs.
- **Full Domain Lifecycle**: `.validate()`, `.normalize()`, `.parse()`, `.format()`, and `.isValid()`.

---

## Usage

```ts
import { phone } from "@idvalidator/global-phone";

// 1. Validate
const result = phone.validate("+62 812-3456-7890");
// { valid: true, errors: [], value: "+6281234567890" }

const invalid = phone.validate("08123456789");
// { valid: false, errors: [{ code: "MISSING_CALLING_CODE", message: "..." }] }

// 2. Normalize
phone.normalize("+1 (555) 234-5678");
// "+15552345678"

// 3. Parse
phone.parse("+62 812 3456 7890");
// { countryCallingCode: "62", nationalNumber: "81234567890" }

// 4. Format
phone.format("+6281234567890");
// "+62 81234567890"

// 5. Quick boolean check
if (phone.isValid("+6281234567890")) {
  // ...
}
```

> **Note**: For country-specific handling that automatically assumes local prefixes (e.g. converting bare `0812...` into `+62812...`), use the respective country package such as `id-validator-id`.

---

## API

- `phone.validate(input: unknown, options?: ValidationOptions): ValidationResult<string>`
- `phone.normalize(input: string): string`
- `phone.parse(input: string): ParsedPhone` (`{ countryCallingCode: string, nationalNumber: string }`)
- `phone.format(input: string): string`
- `phone.isValid(input: unknown): boolean`

---

## License

MIT © [BaimPriyatna](https://github.com/BaimPriyatna)
