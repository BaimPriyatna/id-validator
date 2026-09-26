# Framework integration examples

Copy-paste snippets for using `idvalidator-id` with common stacks.
These are illustrative — adapt imports, error handling, and types to your app.

> [!IMPORTANT]
> Structural validation is not official registration checks (Dukcapil, DJP, etc.).
> See [ARCHITECTURE.md](./ARCHITECTURE.md) and [REFERENCE.md](./REFERENCE.md).

---

## Express — request body middleware

Validate a NIK field before the route handler runs. Uses `nik.validate()` so
clients get machine-readable `code`s (see [ERROR-CODES.md](./ERROR-CODES.md)).

```ts
import express, { Request, Response, NextFunction } from "express";
import { nik } from "idvalidator-id";

const app = express();
app.use(express.json());

function requireValidNik(field = "nik") {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.body?.[field];
    const result = nik.validate(raw);

    if (!result.valid) {
      res.status(400).json({
        error: "validation_failed",
        field,
        errors: result.errors, // [{ code, message }, ...]
      });
      return;
    }

    // Normalized digits for downstream use
    req.body[field] = result.value;
    next();
  };
}

app.post("/register", requireValidNik("nik"), (req, res) => {
  // req.body.nik is a valid, normalized 16-digit string
  res.json({ ok: true, nik: req.body.nik });
});
```

Quick boolean check (no error details):

```ts
if (!nik.isValid(req.body.nik)) {
  res.status(400).json({ error: "invalid_nik" });
  return;
}
```

---

## Zod — `.refine()` / `.superRefine()`

Wire the domain validator into a Zod schema. Prefer `.superRefine()` when you
want to forward this library's error `code`s.

```ts
import { z } from "zod";
import { nik } from "idvalidator-id";

const registerSchema = z.object({
  name: z.string().min(1),
  nik: z
    .string()
    .superRefine((value, ctx) => {
      const result = nik.validate(value);
      if (result.valid) return;

      for (const err of result.errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err.message,
          // Optional: keep the library code for clients / i18n maps
          params: { code: err.code },
        });
      }
    })
    .transform((value) => nik.normalize(value)),
});

// Usage
const parsed = registerSchema.safeParse({
  name: "Ada",
  nik: "3171 0517 0890 0001",
});
// parsed.success → nik is normalized "3171051708900001"
```

Minimal boolean refine:

```ts
const nikField = z.string().refine((v) => nik.isValid(v), {
  message: "Invalid NIK",
});
```

---

## React — form validation

Controlled input with inline errors from `nik.validate()`.

```tsx
import { useState, FormEvent } from "react";
import { nik } from "idvalidator-id";

export function NikForm() {
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = nik.validate(value, {
      messages: {
        REQUIRED: "NIK wajib diisi",
        INVALID_LENGTH: "NIK harus 16 digit",
        INVALID_FORMAT: "NIK hanya boleh berisi angka",
      },
    });

    if (!result.valid) {
      setErrors(result.errors.map((err) => err.message));
      return;
    }

    setErrors([]);
    // result.value is the normalized NIK — send to your API
    console.log("submit", result.value);
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="nik">NIK</label>
      <input
        id="nik"
        name="nik"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length ? "nik-errors" : undefined}
      />
      {errors.length > 0 && (
        <ul id="nik-errors">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
      <button type="submit">Submit</button>
    </form>
  );
}
```

Validate on blur (lighter UX) with `nik.isValid()`:

```tsx
const [touched, setTouched] = useState(false);
const showError = touched && value.length > 0 && !nik.isValid(value);
```

---

## Related

- [REFERENCE.md](./REFERENCE.md) — what each validator checks (and does not)
- [ERROR-CODES.md](./ERROR-CODES.md) — machine-readable error codes
- [packages/id/README.md](./packages/id/README.md) — Indonesia package API overview
