/**
 * Bundle size budgets for id-validator packages.
 *
 * Superseded "Measured baseline (as of 2025-01)" figures below were estimates
 * that did not match reality -- data-id-address was listed at ~30 KB when its
 * entry point is in fact ~82 KB brotli (610 KB once the lazy village chunk is
 * included). Limits are now measured values; see the header below.
 * 
 * Run: npm run size   (requires `npm run build` first)
 * CI: bundle-size job in .github/workflows/ci.yml runs on every PR.
 *
 * COMPRESSION UNITS: size-limit's `gzip: true` measures gzip; `gzip: false`
 * measures brotli (size-limit >= 11). Both appear below so each budget's
 * unit is unambiguous.
 *
 * LIMITS ARE MEASURED + ~15% HEADROOM, NOT ESTIMATES. Every "measured" figure
 * in the comments is what size-limit actually reported for the current tree.
 * When a bundle legitimately grows (new feature, new district data), re-run
 * `npm run size`, read the reported size, and set the limit to measured * 1.15.
 * Do not round up to a "nice" number -- that erodes the gate.
 */

export default [
  // ============================================================================
  // Core Package
  // ============================================================================
  {
    name: "@idvalidator/core - Full",
    path: "packages/core/dist/index.js",
    limit: "2 KB", // measured 502 B gzip
    gzip: true,
  },

  // ============================================================================
  // Indonesia Package (idvalidator-id)
  // ============================================================================
  {
    name: "idvalidator-id - Full package",
    path: "packages/id/dist/index.js",
    limit: "9 KB", // measured 6.68 KB brotli
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "idvalidator-id - NIK only (tree-shaken)",
    path: "packages/id/dist/index.js",
    import: "{ nik }",
    limit: "6.5 KB", // measured 4.83 KB brotli
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "idvalidator-id - NPWP only (tree-shaken)",
    path: "packages/id/dist/index.js",
    import: "{ npwp }",
    limit: "7 KB", // measured 5.28 KB brotli
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "idvalidator-id - Postal Code only (tree-shaken)",
    path: "packages/id/dist/index.js",
    import: "{ postalCode }",
    limit: "6 KB", // measured 4.32 KB brotli
    gzip: false,
    ignore: ["@idvalidator/core"],
  },

  // ============================================================================
  // Indonesia Address Data Package (@idvalidator/data-id-address)
  // ============================================================================
  {
    // CAVEAT: this entry is named for what it covers, not for what it measures.
    // size-limit bundles the entry point and *follows dynamic import()*, so the
    // lazy village chunk is included here even though the sync API never loads
    // it. The base entry alone brotlis to ~82 KB; the standalone "Village data"
    // budget below is what actually governs the dataset's growth.
    name: "@idvalidator/data-id-address - Full (base + lazy village chunk)",
    path: "packages/data-id-address/dist/index.js",
    limit: "700 KB", // measured 610 KB brotli
    gzip: false,
    ignore: ["@idvalidator/core"],
  },

  // ============================================================================
  // Global Validators
  // ============================================================================
  {
    name: "@idvalidator/global-email",
    path: "packages/global/email/dist/index.js",
    limit: "2 KB", // measured 648 B gzip
    gzip: true,
  },
  {
    name: "@idvalidator/global-phone - Full",
    path: "packages/global/phone/dist/index.js",
    limit: "2 KB", // measured 951 B brotli
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "@idvalidator/global-iban",
    path: "packages/global/iban/dist/index.js",
    limit: "6 KB", // measured 4.86 KB gzip
    gzip: true,
  },
  {
    name: "IBAN country registry data",
    path: "packages/global/iban/data/iban-countries.json",
    limit: "4.2 KB", // measured 3.49 KB gzip
    gzip: true,
  },
  {
    name: "@idvalidator/global-currency",
    path: "packages/global/currency/dist/index.js",
    limit: "8.5 KB", // measured 7.26 KB gzip
    gzip: true,
  },
  {
    name: "ISO 4217 currency list",
    path: "packages/global/currency/data/iso4217.json",
    limit: "7 KB", // measured 6.02 KB gzip
    gzip: true,
  },

  // ============================================================================
  // Large Data Files (tracked separately)
  // ============================================================================
  {
    name: "Village data (lazy-loaded) - GZIP",
    path: "packages/data-id-address/data/village-postal-index.json",
    limit: "750 KB", // measured 643 KB gzip (2.5 MB raw)
    gzip: true,
  },
  {
    name: "Admin hierarchy data",
    path: "packages/data-id-address/data/admin-hierarchy.json",
    limit: "75 KB", // measured 65.6 KB gzip (550 KB raw)
    gzip: true,
  },
  {
    name: "Postal index data",
    path: "packages/data-id-address/data/postal-index.json",
    limit: "58 KB", // measured 50.7 KB gzip (794 KB raw)
    gzip: true,
  },
  {
    name: "Indonesia regions data (embedded in idvalidator-id)",
    path: "packages/id/data/regions.json",
    limit: "6 KB", // measured 4.87 KB gzip
    gzip: true,
  },
  {
    name: "Phone calling codes data",
    path: "packages/global/phone/data/calling-codes.json",
    limit: "2 KB", // measured 547 B gzip
    gzip: true,
  },
];
