# Error Code Reference

This document consolidates all error codes used across the id-validator library and documents their stability guarantees.

## Error Code Stability

Error codes in this library follow a **stable contract**:

- **Core error codes** (defined in `@id-validator/core`) are **stable** and will not be removed or have their meaning changed in minor or patch releases
- **Domain-specific error codes** (specific to validators like NIK, NPWP, phone) are **stable** once introduced
- New error codes may be added in minor releases
- Error code removal or semantic changes require a major version bump
- Error **messages** (the human-readable text) may be improved in minor releases without being considered a breaking change

## Core Error Codes

These codes are defined in `@id-validator/core` and used across all validators:

### `REQUIRED`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Input is required but was not provided (null, undefined, or empty after normalization)

**Used by:** All validators

**Example:**
```typescript
nik.validate(null)
// => { valid: false, errors: [{ code: "REQUIRED", message: "NIK is required." }] }
```

---

### `INVALID_TYPE`
**Status:** Stable  
**Meaning:** Input is not a string type (received number, boolean, object, array, etc.)

**Used by:** All validators (via `ensureValidInput`)

**Example:**
```typescript
nik.validate(123456)
// => { valid: false, errors: [{ code: "INVALID_TYPE", message: "Input must be a string, received number." }] }
```

---

### `INVALID_LENGTH`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Input length does not match the expected fixed length, or exceeds maximum allowed length

**Used by:** NIK, NPWP, postal code, SIM, and input safety guard

**Example:**
```typescript
nik.validate("123")
// => { valid: false, errors: [{ code: "INVALID_LENGTH", message: "NIK must be 16 digits." }] }

nik.validate("1".repeat(1001))
// => { valid: false, errors: [{ code: "INVALID_LENGTH", message: "Input exceeds maximum length of 1000 characters." }] }
```

---

### `INVALID_FORMAT`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Input does not match the expected structural pattern

**Used by:** NIK, NPWP, email, phone, passport, license plate, postal code

**Example:**
```typescript
email.validate("not-an-email")
// => { valid: false, errors: [{ code: "INVALID_FORMAT", message: "Email does not match the expected local@domain.tld shape." }] }
```

---

### `INVALID_CHECKSUM`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Input has a valid structure but fails checksum validation

**Used by:** NPWP (legacy format with mod-11 checksum)

**Example:**
```typescript
npwp.validate("012345678901234")
// => { valid: false, errors: [{ code: "INVALID_CHECKSUM", message: "NPWP check digit does not match (heuristic algorithm)." }] }
```

---

## Domain-Specific Error Codes

### `INVALID_REGION_CODE`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Administrative region code (province, regency, or district) is not recognized in the reference dataset

**Used by:** NIK validator

**Example:**
```typescript
nik.validate("9971051708900001")
// => { valid: false, errors: [{ code: "INVALID_REGION_CODE", message: "Province code 99 is not a recognized Kemendagri code." }] }
```

---

### `INVALID_DATE`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Date component (day or month) is out of valid range

**Used by:** NIK validator

**Example:**
```typescript
nik.validate("3171059908900001")
// => { valid: false, errors: [{ code: "INVALID_DATE", message: "Day-of-birth component is out of range." }] }
```

---

### `INVALID_SEQUENCE`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Sequence number component is invalid (e.g., all zeros when not allowed)

**Used by:** NIK validator

**Example:**
```typescript
nik.validate("3171051708900000")
// => { valid: false, errors: [{ code: "INVALID_SEQUENCE", message: "Sequence number cannot be 0000." }] }
```

---

### `MISSING_CALLING_CODE`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Phone number does not include a country calling code (E.164 requires "+")

**Used by:** Global phone validator

**Example:**
```typescript
phone.validate("12345678")
// => { valid: false, errors: [{ code: "MISSING_CALLING_CODE", message: "Phone number must include a country calling code (e.g. +62...)." }] }
```

---

### `UNKNOWN_CALLING_CODE`
**Status:** Stable  
**Introduced:** v1.0.0  
**Meaning:** Country calling code is not recognized in the reference dataset

**Used by:** Global phone validator

**Example:**
```typescript
phone.validate("+9991234567890")
// => { valid: false, errors: [{ code: "UNKNOWN_CALLING_CODE", message: "No known country calling code matches this number." }] }
```

---

## Error Code Usage Patterns

### Single Error vs. Multiple Errors

Validators return arrays of errors to support validation scenarios that may have multiple independent issues:

```typescript
// Single error - stops at first structural issue
nik.validate("123")
// => { valid: false, errors: [{ code: "INVALID_LENGTH", ... }] }

// Multiple errors - collects all validation issues
nik.validate("0000059908900000")
// => { 
//   valid: false, 
//   errors: [
//     { code: "INVALID_REGION_CODE", message: "Province code 00..." },
//     { code: "INVALID_DATE", message: "Day-of-birth component..." },
//     { code: "INVALID_SEQUENCE", message: "Sequence number..." }
//   ]
// }
```

### Error Message Customization

Validators support per-call message overrides:

```typescript
nik.validate(input, {
  messages: {
    INVALID_LENGTH: "Nomor NIK harus 16 digit",
    INVALID_FORMAT: "Format NIK tidak valid"
  }
})
```

Resolution order:
1. Per-call custom message (if provided)
2. Built-in default message

---

## Versioning and Breaking Changes

### What Constitutes a Breaking Change

**Breaking changes (require major version bump):**
- Removing an error code
- Changing the meaning or trigger condition of an error code
- Changing the structure of `ValidationError` or `ValidationResult`

**Non-breaking changes (allowed in minor/patch releases):**
- Adding new error codes
- Improving error message text
- Adding more validation checks that introduce existing error codes

### Deprecation Process

If an error code needs to be removed or changed:

1. Error code is marked as deprecated in documentation
2. Deprecation notice spans at least one minor release
3. Code is removed or changed in the next major release

---

## Testing Error Codes

All error codes are covered by automated tests. When adding a new error code:

1. Add it to this reference document
2. Mark its stability status
3. Add test cases covering all conditions that trigger it
4. Document example usage

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and validation philosophy
- [REFERENCE.md](./REFERENCE.md) - Complete API reference
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute new validators or error codes
