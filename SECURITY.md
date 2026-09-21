# Security Policy

## Regular Expression Denial of Service (ReDoS) Audit

**Last Audit Date:** December 2024  
**Status:** No ReDoS vulnerabilities identified

### Summary

All regular expressions used in the id-validator library have been audited for potential Regular Expression Denial of Service (ReDoS) vulnerabilities. The audit confirms that all patterns are safe and use linear-time matching.

---

## Audited Regular Expressions

### Core Package (`@idvalidator/core`)

#### 1. Whitespace Stripping
**Location:** `packages/core/src/normalize.ts`
```typescript
/\s+/g
```
**Analysis:** SAFE - Simple character class with no nested quantifiers or backtracking.

---

#### 2. Separator Stripping
**Location:** `packages/core/src/normalize.ts`
```typescript
/[-./]/g
```
**Analysis:** SAFE - Simple character class, no quantifiers.

---

#### 3. Digit Extraction
**Location:** `packages/core/src/normalize.ts`
```typescript
/\D/g
```
**Analysis:** SAFE - Single negated character class, no quantifiers or alternatives.

---

#### 4. Expected Characters Check
**Location:** `packages/core/src/input-safety.ts`
```typescript
/^[\d\s.\-/]+$/
```
**Analysis:** SAFE - Anchored pattern with single character class and simple quantifier. No backtracking risk.

---

### Email Validator (`@idvalidator/global-email`)

#### 5. Email Pattern
**Location:** `packages/global/email/src/index.ts`
```typescript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```
**Analysis:** SAFE
- Anchored with `^` and `$`
- Uses negated character classes `[^\s@]` which are efficient
- Simple `+` quantifiers on character classes (not nested groups)
- No alternation or nested quantifiers
- Linear time complexity O(n)

---

### Phone Validator (`@idvalidator/global-phone`)

#### 6. E.164 Pattern
**Location:** `packages/global/phone/src/index.ts`
```typescript
/^\+[1-9]\d{7,14}$/
```
**Analysis:** SAFE
- Fully anchored pattern
- Fixed-length bounded quantifier `{7,14}`
- No nested quantifiers or backtracking
- Character classes are simple and non-overlapping
- Linear time complexity O(n)

---

### NIK Validator (`@idvalidator/id`)

#### 7. Digit Validation
**Location:** `packages/id/src/nik/index.ts`
```typescript
/^\d{16}$/
```
**Analysis:** SAFE
- Fully anchored with exact length quantifier
- No backtracking possible
- Constant time complexity O(1) for length check

---

### Passport Validator (`@idvalidator/id`)

#### 8. Passport Pattern
**Location:** `packages/id/src/passport/index.ts`
```typescript
/^[A-Z]\d{7}$/
```
**Analysis:** SAFE
- Fully anchored with exact length quantifiers
- No overlapping character classes
- No backtracking
- Constant time complexity O(1)

---

### License Plate Validator (`@idvalidator/id`)

#### 9. License Plate Pattern
**Location:** `packages/id/src/licensePlate/index.ts`
```typescript
/^([A-Z]{1,2})\s*([1-9]\d{0,3})\s*([A-Z]{0,3})$/
```
**Analysis:** SAFE
- Fully anchored pattern
- All quantifiers are bounded: `{1,2}`, `{0,3}`, `*` on `\s` (whitespace)
- Capture groups use non-overlapping character classes
- No nested quantifiers
- No exponential backtracking paths
- Linear time complexity O(n)

---

### Postal Code Validator (`@idvalidator/id`)

#### 10. Postal Code Pattern
**Location:** `packages/id/src/postalCode/index.ts`
```typescript
/^\d{5}$/
```
**Analysis:** SAFE
- Fully anchored with exact length quantifier
- No backtracking possible
- Constant time complexity O(1)

---

## Input Length Protection

All validators enforce a maximum input length of **1000 characters** via `ensureValidInput()` function in the core package. This provides defense-in-depth against:

- Resource exhaustion attacks
- ReDoS (even though patterns are safe)
- Memory exhaustion
- Algorithmic complexity attacks

```typescript
// packages/core/src/input-safety.ts
export const MAX_INPUT_LENGTH = 1000;
```

No legitimate ID or validation input should exceed this length, even with separators and formatting.

---

## ReDoS Risk Factors - None Present

The audit confirmed that the codebase contains **NONE** of the following ReDoS risk patterns:

- **Nested Quantifiers** - e.g., `(a+)+`, `(a*)*`, `(a+)*`
- **Overlapping Alternatives** - e.g., `(a|a)*`, `(a|ab)*`
- **Overlapping Repeating Groups** - e.g., `([a-z]+)*`
- **Unbounded Quantifiers on Complex Groups** - e.g., `(a|b|c)+*`
- **Non-anchored Patterns with Backtracking** - e.g., `.*abc.*xyz`

All patterns use:

- Anchored patterns (`^...$`)
- Bounded quantifiers (`{n}`, `{n,m}`)
- Non-overlapping character classes
- Simple quantifiers on character classes (not groups)

---

## Testing Strategy

ReDoS protection is validated through:

1. **Input Safety Tests** - All validators test against excessively long inputs (1001+ chars)
2. **Maximum Length Guard** - `ensureValidInput()` rejects inputs > 1000 chars before regex evaluation
3. **Pattern Analysis** - All regex patterns reviewed for linear time complexity
4. **Fuzz Testing Recommendation** - Consider adding automated fuzzing in future releases

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this library:

1. **DO NOT** open a public GitHub issue
2. Email the maintainers directly at: [security contact from package.json]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Affected versions
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

---

## Security Update Policy

- **Critical vulnerabilities** (RCE, ReDoS, data leakage): Patch release within 48 hours
- **High severity** (DoS, input validation bypass): Patch release within 7 days
- **Medium/Low severity**: Fixed in next minor release

Security patches will be backported to the previous major version if still in active support.

---

## Related Documentation

- [ERROR-CODES.md](./ERROR-CODES.md) - Error code stability and versioning
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and security boundaries
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to report issues responsibly
