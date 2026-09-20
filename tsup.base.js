// Shared tsup config for every publishable package: dual ESM/CJS + .d.ts,
// workspace dependencies stay external (resolved via npm workspace symlinks
// at install time) rather than bundled in, so a single dependency graph
// exists at runtime instead of duplicated copies per package.
import { defineConfig } from "tsup";

export function baseConfig(overrides = {}) {
  return defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
    ...overrides,
  });
}
