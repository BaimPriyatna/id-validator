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
  splitting: false,
  sourcemap: false,
  clean: true,
});
