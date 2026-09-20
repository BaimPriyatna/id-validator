import { baseConfig } from "../../tsup.base.js";

// Sourcemaps are useless here — the "source" is one giant JSON literal,
// not code anyone will step through — and would otherwise nearly double
// the published tarball size for no benefit.
export default baseConfig({ sourcemap: false });
