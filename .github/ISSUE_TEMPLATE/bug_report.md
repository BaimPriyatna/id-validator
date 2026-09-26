---
name: Bug report
about: Something doesn't work as documented — help us reproduce it
title: "[bug] "
labels: bug
---

## Description

A clear summary of what went wrong.

## Environment

- **Package:** (e.g. `idvalidator-id`, `@idvalidator/core`)
- **Package version:** (e.g. `1.0.2` — from `package.json` or `npm ls`)
- **Node.js version:** (e.g. `20.11.0` — `node -v`)
- **Runtime / bundler:** (Node / browser / Bun / Deno / webpack / vite / …)
- **OS:** (e.g. Windows 11, macOS 14, Ubuntu 22.04)

## Minimal reproduction

Steps or a short code snippet that fails. Prefer the smallest example that still shows the bug.

```ts
import { nik } from "idvalidator-id";

console.log(nik.validate("…"));
```

## Expected behavior

What you expected to happen.

## Actual behavior

What happened instead (include the full `ValidationResult` / stack trace if relevant).

## Additional context

Anything else that helps (links, related issues, screenshots of the error).
