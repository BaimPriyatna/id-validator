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
      ],
      // Coverage thresholds are informational only - NOT blocking
      // This allows tracking progress without making coverage a merge gate yet
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: {
      "@id-validator/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
    },
  },
});
