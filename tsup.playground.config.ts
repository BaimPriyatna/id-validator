import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    idvalidator: "packages/id/src/index.ts",
    "idvalidator-data": "packages/data-id-address/src/index.ts",
  },
  format: ["esm"],
  platform: "browser",
  target: "es2020",
  outDir: "playground/dist",
  // @idvalidator/* are external in packages/id's own build (published separately
  // to npm); the playground has no bundler/node_modules to resolve them at
  // runtime, so they must be inlined into a single file here.
  noExternal: [/^@idvalidator\//],
  dts: false,
  minify: true,
  // Splitting lets the village-level dataset (dynamically imported inside
  // @idvalidator/data-id-address) land in its own chunk instead of being
  // merged into idvalidator-data.js -- so opening the region-lookup card
  // doesn't cost ~2.7MB extra unless a village-level lookup is actually run.
  splitting: true,
  sourcemap: false,
  clean: true,
});
