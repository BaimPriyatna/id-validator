# @idvalidator/global-email

Structural email validator and parser designed for real-world web and backend applications.

```bash
npm install @idvalidator/global-email
```

This package validates, normalizes, and parses email addresses according to realistic internet mail provider conventions (preventing common RFC 5322 edge-case issues while rejecting malformed inputs, spaces, emojis, and non-ASCII characters).

---

## Features

- **Practical Mail Validation**: Rejects malformed addresses, consecutive dots, missing TLDs, and leading/trailing dots in domain/local-part.
- **Input Safety**: Guards against Unicode spoofing, emoji injection, and non-ASCII domain characters.
- **Full Lifecycle**: `.validate()`, `.normalize()`, `.parse()`, and `.isValid()`.
- **Custom Error Messages**: Supports per-call message overrides for internationalization / custom error displays.

---

## Usage

```ts
import { email } from "@idvalidator/global-email";

// 1. Validate
const result = email.validate("User.Name@Example.COM");
// { valid: true, errors: [], value: "user.name@example.com" }

const invalid = email.validate("user@.com");
// { valid: false, errors: [{ code: "INVALID_FORMAT", message: "..." }] }

// 2. Normalize (lowercased, trimmed)
email.normalize("  Dev@Company.ORG  ");
// "dev@company.org"

// 3. Parse
email.parse("alex@sub.domain.co.id");
// { localPart: "alex", domain: "sub.domain.co.id" }

// 4. Custom Error Messages (Localization)
email.validate("", {
  messages: {
    REQUIRED: "Alamat email wajib diisi.",
  },
});

// 5. Quick boolean check
if (email.isValid("user@domain.com")) {
  // ...
}
```

---

## API

- `email.validate(input: unknown, options?: ValidationOptions): ValidationResult<string>`
- `email.normalize(input: string): string`
- `email.parse(input: string): ParsedEmail` (`{ localPart: string, domain: string }`)
- `email.isValid(input: unknown): boolean`

---

## License

MIT © [BaimPriyatna](https://github.com/BaimPriyatna)
