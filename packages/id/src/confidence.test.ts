import { describe, it, expect } from "vitest";
import { nik, npwp, sim, passport, postalCode, licensePlate, email } from "idvalidator-id";
import { phone as globalPhone } from "@idvalidator/global-phone";
import { iban } from "@idvalidator/global-iban";
import { currency } from "@idvalidator/global-currency";
import type { ValidationConfidence } from "@idvalidator/core";

// The tier a validator reports is a factual claim about how much it actually
// checked. These tests pin it so it cannot drift silently when a validator's
// internals change -- e.g. someone "upgrading" sim to a length check without
// realizing they did not gain a checksum.
describe("ValidationResult.confidence - declared tiers", () => {
  const cases: Array<[string, () => ValidationConfidence | undefined, ValidationConfidence]> = [
    // mod-97-10 check digit is mathematically verified.
    ["iban", () => iban.validate("DE89370400440532013000").confidence, "cryptographic"],
    // Legacy 15-digit NPWP carries a real mod-11 checksum.
    ["npwp (legacy 15)", () => npwp.validate("01.234.567.4-000.000").confidence, "cryptographic"],
    // Registry-backed: official reference dataset consulted.
    ["npwp (nik-based 16)", () => npwp.validate("1601010101010001").confidence, "registry"],
    ["nik", () => nik.validate("1601010101010001").confidence, "registry"],
    ["phone (global)", () => globalPhone.validate("+6281234567890").confidence, "registry"],
    ["currency", () => currency.validate("USD").confidence, "registry"],
    // Structure only: pattern/length, no reference data.
    ["postalCode", () => postalCode.validate("40115").confidence, "structural"],
    ["licensePlate", () => licensePlate.validate("B 1234 ABC").confidence, "structural"],
    ["email", () => email.validate("user@example.com").confidence, "structural"],
    // Heuristic: shape only. Any value of the right shape passes.
    ["sim", () => sim.validate("123456789012").confidence, "heuristic"],
    ["passport", () => passport.validate("C1234567").confidence, "heuristic"],
  ];

  for (const [name, read, expected] of cases) {
    it(`${name} reports "${expected}"`, () => {
      const result = read();
      expect(result).toBe(expected);
    });
  }
});

describe("ValidationResult.confidence - semantics", () => {
  it("is absent on invalid results, where it would be meaningless", () => {
    expect(nik.validate("123").confidence).toBeUndefined();
    expect(sim.validate("1").confidence).toBeUndefined();
    expect(iban.validate("nonsense").confidence).toBeUndefined();
    expect(currency.validate("ZZZ").confidence).toBeUndefined();
  });

  it("is absent for the input-safety rejections that short-circuit first", () => {
    expect(nik.validate(null).confidence).toBeUndefined();
    expect(iban.validate(42).confidence).toBeUndefined();
  });

  it("makes the weak validators' weakness observable", () => {
    // These all pass -- that is the whole point of the feature: a consumer can
    // now SEE that sim/passport prove nothing beyond shape, instead of having
    // to read the source to learn it.
    expect(sim.validate("000000000000").valid).toBe(true);
    expect(sim.validate("000000000000").confidence).toBe("heuristic");
    expect(passport.validate("Z0000000").valid).toBe(true);
    expect(passport.validate("Z0000000").confidence).toBe("heuristic");
  });

  it("separates cryptographically-checked from registry-checked for the same shape", () => {
    // Both are "valid"; only confidence distinguishes how much was proven.
    const n = nik.validate("1601010101010001");
    const i = iban.validate("DE89370400440532013000");
    expect(n.valid && i.valid).toBe(true);
    expect(n.confidence).not.toBe(i.confidence);
  });

  it("is a fixed, ordered set of levels", () => {
    // Not annotated as ValidationConfidence[]: the `?? "missing"` sentinel is
    // what makes a dropped tier fail the assertion below rather than slip
    // through as `undefined`. The declared element type would reject it.
    const levels = [
      nik.validate("1601010101010001").confidence ?? "missing",
      postalCode.validate("40115").confidence ?? "missing",
      sim.validate("123456789012").confidence ?? "missing",
    ];
    expect(levels).toEqual(["registry", "structural", "heuristic"]);
  });
});
