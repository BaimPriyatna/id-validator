# Benchmarks

Measured throughput for `idvalidator-id` validators. Use these for relative
comparisons (before/after a change), not as hard SLAs — absolute numbers move
with CPU, Node version, and background load.

## Quick results (100,000 iterations)

Machine used for the table below: **Node 22.22.0 · win32 x64** (developer laptop).
Command: `npm run build && npm run bench:throughput`.

| Operation | Time for 100k | Approx. ops/sec |
| --- | ---: | ---: |
| `nik.validate` (valid) | ~97 ms | ~1.0M |
| `nik.validate` (invalid short) | ~52 ms | ~1.9M |
| `nik.isValid` (valid) | ~92 ms | ~1.1M |
| `nik.parse` (valid) | ~226 ms | ~0.4M |
| `npwp.validate` (legacy 15-digit) | ~39 ms | ~2.5M |
| `npwp.validate` (NIK-based 16-digit) | ~109 ms | ~0.9M |
| `phone.validate` (local `08…`) | ~373 ms | ~0.3M |
| `phone.validate` (E.164) | ~346 ms | ~0.3M |
| `postalCode.validate` | ~32 ms | ~3.1M |
| `licensePlate.validate` | ~59 ms | ~1.7M |
| `email.validate` | ~31 ms | ~3.3M |

Headline: **~100k valid NIK checks in under ~100 ms** on the machine above
(roughly a million validations per second).

## How to run

```bash
npm install
npm run build

# Batch timing table (100k by default; good for README-style numbers)
npm run bench:throughput
npm run bench:throughput -- --iterations=500000

# Vitest + Tinybench (ops/sec, p75/p99, relative summary)
npm run bench

# Save / compare a baseline (regression check)
npx vitest bench --run --outputJson benchmarks/baseline.json
npx vitest bench --run --compare benchmarks/baseline.json
```

`npm test` does **not** run benchmarks (they are slower and noisier).

## Files

| Path | Role |
| --- | --- |
| [`packages/id/src/id.bench.ts`](./packages/id/src/id.bench.ts) | Vitest `bench` definitions |
| [`scripts/throughput.mjs`](./scripts/throughput.mjs) | Fixed-iteration wall-clock timing |
| [`benchmarks/baseline.json`](./benchmarks/baseline.json) | Last committed Vitest bench snapshot for `--compare` |

## Methodology notes

- Fixtures are the same synthetic values used in unit tests (not real registered IDs).
- Throughput script warms up before measuring; Vitest bench uses Tinybench sampling.
- When you change hot paths (region lookup, normalize, phone preprocessing), re-run
  both commands and update this table + `benchmarks/baseline.json` if the delta is
  intentional.
