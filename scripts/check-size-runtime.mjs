// Preflight for `npm run size`.
//
// size-limit@14 imports `glob` from node:fs/promises, which only exists in
// newer Node runtimes (its engines field says ^22.19.0 || ^24.5.0 || >=26). npm
// only *warns* on an engine mismatch, so an unsupported Node installs cleanly and
// then dies with an opaque SyntaxError deep inside size-limit's own code --
// which reads like a broken tool rather than a wrong runtime.
//
// This checks the actual capability size-limit depends on rather than parsing a
// version string, so it stays correct if Node renumbers the feature again.
//
// Deliberately a preflight rather than `engine-strict=true` in .npmrc:
// engine-strict would fail `npm ci` on every Node version that merely
// *installs* size-limit without running it.
//
// NOTE: this must stay a namespace import. A named
// `import { glob } from "node:fs/promises"` would throw the very SyntaxError
// this file exists to catch, before the check could run.
import * as fsPromises from "node:fs/promises";

if (typeof fsPromises.glob !== "function") {
  console.error(
    [
      "",
      "npm run size requires a newer Node than this one (" + process.version + ").",
      "size-limit@14 imports `glob` from node:fs/promises, which is unavailable here.",
      "",
      "Use Node >= 22.19 (the version .github/workflows/ci.yml runs for the",
      "bundle-size job). The published packages themselves still support Node >= 18.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
