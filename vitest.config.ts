import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["packages/**/src/**/*.ts"],
      exclude: [
        "packages/**/src/**/*.test.ts",
        "packages/**/src/**/*.config.ts",
        "**/node_modules/**",
        "**/dist/**",
        // Pure re-export barrels: there is no branch/logic to cover here,
        // only `export { x } from "./y.js"` lines. The re-exported code is
        // tested directly at its own source file.
        "packages/id/src/index.ts",
        "packages/id/src/email/index.ts",
        // Type-only file: interfaces/types have no runtime code to execute.
        "packages/core/src/types.ts",
        // Intentionally unimplemented placeholders (PRD future scope, not
        // v1) - see their README.md files. Nothing to test until they
        // have real logic.
        "packages/global/country-code/**",
        "packages/global/currency/**",
        "packages/global/iban/**",
      ],
      // Enforced (not just informational) as of the P1 coverage pass -
      // actual coverage is ~98% after excluding the files above; 90% is
      // set as a real floor with headroom, not a target to hug exactly.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@idvalidator/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
    },
  },
});

