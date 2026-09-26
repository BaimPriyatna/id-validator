import { bench, describe } from "vitest";
import { nik } from "./nik/index.js";
import { npwp } from "./npwp/index.js";
import { phone } from "./phone/index.js";
import { postalCode } from "./postalCode/index.js";
import { licensePlate } from "./licensePlate/index.js";
import { email } from "./email/index.js";

// Synthetic fixtures from unit tests — not real registered identifiers.
const NIK_VALID = "3171051708900001";
const NIK_INVALID = "123";
const NPWP_LEGACY = "012345674000000";
const PHONE_LOCAL = "08123456789";
const POSTAL = "40115";
const PLATE = "B 1234 XYZ";
const EMAIL = "user@example.com";

describe("nik", () => {
  bench("validate (valid)", () => {
    nik.validate(NIK_VALID);
  });

  bench("validate (invalid short)", () => {
    nik.validate(NIK_INVALID);
  });

  bench("isValid (valid)", () => {
    nik.isValid(NIK_VALID);
  });

  bench("parse (valid)", () => {
    nik.parse(NIK_VALID);
  });
});

describe("npwp", () => {
  bench("validate legacy 15-digit (valid)", () => {
    npwp.validate(NPWP_LEGACY);
  });

  bench("validate NIK-based 16-digit (valid)", () => {
    npwp.validate(NIK_VALID);
  });
});

describe("phone", () => {
  bench("validate local ID format (valid)", () => {
    phone.validate(PHONE_LOCAL);
  });

  bench("validate E.164 (valid)", () => {
    phone.validate("+628123456789");
  });
});

describe("postalCode", () => {
  bench("validate (valid)", () => {
    postalCode.validate(POSTAL);
  });
});

describe("licensePlate", () => {
  bench("validate (valid)", () => {
    licensePlate.validate(PLATE);
  });

  bench("format lowercase input", () => {
    licensePlate.format("b1234xyz");
  });
});

describe("email", () => {
  bench("validate (valid)", () => {
    email.validate(EMAIL);
  });
});
