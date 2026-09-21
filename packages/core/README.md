# @idvalidator/core

Core types, error contracts, validation results, and input normalization primitives for the `id-validator` ecosystem.

```bash
npm install @idvalidator/core
```

This package serves as the shared foundation for all `id-validator` country and global modules (e.g. `id-validator-id`, `@idvalidator/global-phone`, `@idvalidator/global-email`). It can also be consumed directly if you are authoring custom validators conforming to the `id-validator` architecture.

---

## Features

- **Standardized Result Contract**: Unified `ValidationResult<T>` and `ValidationError` model across all packages.
- **Common Error Codes**: Enum `CoreErrorCode` (`REQUIRED`, `INVALID_TYPE`, `INVALID_FORMAT`, `INVALID_LENGTH`, `INVALID_CHECKSUM`, `OUT_OF_RANGE`).
- **Input Safety Primitives**: Guard functions against excessive lengths (`MAX_SAFE_INPUT_LENGTH`), non-ASCII/emojis, and invalid types.
- **Zero External Dependencies**: Pure TypeScript, tiny footprint.

---

## Usage

### Result & Error Types

```ts
import type { ValidationResult, ValidationError, ValidationOptions } from "@idvalidator/core";
import { CoreErrorCode, makeError } from "@idvalidator/core";

function myCustomValidator(input: unknown): ValidationResult<string> {
  if (typeof input !== "string" || !input.trim()) {
    return {
      valid: false,
      errors: [makeError(CoreErrorCode.REQUIRED, "Value is required.")],
    };
  }

  return {
    valid: true,
    errors: [],
    value: input.trim(),
  };
}
```

### Input Normalization & Safety Primitives

```ts
import { 
  digitsOnly, 
  ensureValidInput, 
  hasNonAscii, 
  isSafeInputLength,
  MAX_SAFE_INPUT_LENGTH 
} from "@idvalidator/core";

// Strip non-digit characters
digitsOnly("0812-3456-789"); // "08123456789"

// Fast pre-check for emojis and non-ASCII Unicode characters
hasNonAscii("user@domain.com"); // false
hasNonAscii("user🎉@domain.com"); // true

// Safety guard: ensure input is string, non-null, within max length
const safe = ensureValidInput(userInput);
if (typeof safe !== "string") {
  // safe is already a failed ValidationResult with appropriate error code
  return safe;
}
```

---

## API Overview

### Types & Interfaces

- `ValidationResult<T>`: `{ valid: boolean; errors: ValidationError[]; value?: T }`
- `ValidationError`: `{ code: string; message: string }`
- `ValidationOptions`: `{ messages?: Record<string, string> }`

### Utility Functions

- `makeError(code, defaultMessage, options?)`: Creates a `ValidationError`, respecting optional custom message overrides.
- `digitsOnly(input)`: Extracts only `0-9` characters from a string.
- `hasNonAscii(input)`: Returns `true` if input contains non-ASCII characters (> 127).
- `ensureValidInput(input, maxLength?)`: Type and length validator returning `string` or `ValidationResult`.
- `isSafeInputLength(input, maxLength?)`: Checks if string length does not exceed limit (default 256).

---

## License

MIT © [BaimPriyatna](https://github.com/BaimPriyatna)
