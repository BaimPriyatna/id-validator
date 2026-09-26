/**
 * Batch throughput: time N validations and print ms + ops/sec.
 * Uses the built package (run `npm run build` first).
 *
 *   node scripts/throughput.mjs
 *   node scripts/throughput.mjs --iterations=100000
 */
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  nik,
  npwp,
  phone,
  postalCode,
  licensePlate,
  email,
} = require("../packages/id/dist/index.cjs");

const iterationsArg = process.argv.find((a) => a.startsWith("--iterations="));
const ITERATIONS = iterationsArg
  ? Number(iterationsArg.split("=")[1])
  : 100_000;
const WARMUP = Math.min(2_000, Math.floor(ITERATIONS / 10));

if (!Number.isFinite(ITERATIONS) || ITERATIONS < 1) {
  console.error("Invalid --iterations value");
  process.exit(1);
}

const fixtures = {
  "nik.validate (valid)": () => nik.validate("3171051708900001"),
  "nik.validate (invalid)": () => nik.validate("123"),
  "nik.isValid (valid)": () => nik.isValid("3171051708900001"),
  "nik.parse (valid)": () => nik.parse("3171051708900001"),
  "npwp.validate legacy": () => npwp.validate("012345674000000"),
  "npwp.validate nik-16": () => npwp.validate("3171051708900001"),
  "phone.validate local": () => phone.validate("08123456789"),
  "phone.validate E.164": () => phone.validate("+628123456789"),
  "postalCode.validate": () => postalCode.validate("40115"),
  "licensePlate.validate": () => licensePlate.validate("B 1234 XYZ"),
  "email.validate": () => email.validate("user@example.com"),
};

function time(fn) {
  for (let i = 0; i < WARMUP; i++) fn();
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  return performance.now() - start;
}

const node = process.versions.node;
const platform = `${process.platform} ${process.arch}`;

console.log(`idvalidator-id throughput`);
console.log(`Node ${node} · ${platform}`);
console.log(`iterations=${ITERATIONS.toLocaleString("en-US")} · warmup=${WARMUP.toLocaleString("en-US")}`);
console.log("");

const rows = [];
for (const [name, fn] of Object.entries(fixtures)) {
  const ms = time(fn);
  const ops = (ITERATIONS / ms) * 1000;
  rows.push({ name, ms, ops });
}

const nameWidth = Math.max(...rows.map((r) => r.name.length), 4);
console.log(
  `${"name".padEnd(nameWidth)}  ${"ms".padStart(10)}  ${"ops/sec".padStart(14)}`,
);
console.log(`${"-".repeat(nameWidth)}  ${"-".repeat(10)}  ${"-".repeat(14)}`);
for (const r of rows) {
  console.log(
    `${r.name.padEnd(nameWidth)}  ${r.ms.toFixed(2).padStart(10)}  ${Math.round(r.ops).toLocaleString("en-US").padStart(14)}`,
  );
}

console.log("");
console.log("Numbers vary by machine/load — use for relative comparisons, not absolute SLAs.");
