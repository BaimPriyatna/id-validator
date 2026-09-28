/**
 * Bundle size budgets for id-validator packages
 * 
 * Limits are set ~30-40% above current measured sizes to provide headroom during
 * active development while still catching significant regressions:
 * - Feature additions and code structure changes
 * - Legitimate data updates (new regions, postal codes, etc.)
 * - TypeScript/build tooling changes
 * - Early-stage API exploration
 * 
 * Measured baseline (as of 2025-01):
 * - idvalidator-id full: ~62 KB minified
 * - idvalidator-id NIK only: ~30 KB (includes province/regency dataset)
 * - @idvalidator/data-id-address base: ~30 KB
 * - @idvalidator/data-id-address with village: ~680 KB
 * 
 * Run: npm run size
 * CI: Runs on every PR to catch regressions
 */

module.exports = [
  // ============================================================================
  // Core Package
  // ============================================================================
  {
    name: "@idvalidator/core - Full",
    path: "packages/core/dist/index.js",
    limit: "8 KB",  // baseline ~4-5 KB gzip, +40% headroom
    gzip: true,
  },

  // ============================================================================
  // Indonesia Package (idvalidator-id)
  // ============================================================================
  {
    name: "idvalidator-id - Full package",
    path: "packages/id/dist/index.js",
    limit: "90 KB",  // baseline ~62 KB, +45% headroom
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "idvalidator-id - NIK only (tree-shaken)",
    path: "packages/id/dist/index.js",
    import: "{ nik }",
    limit: "42 KB",  // baseline ~30 KB, +40% headroom
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "idvalidator-id - NPWP only (tree-shaken)",
    path: "packages/id/dist/index.js",
    import: "{ npwp }",
    limit: "13 KB",  // baseline ~8-9 KB, +40% headroom
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  {
    name: "idvalidator-id - Postal Code only (tree-shaken)",
    path: "packages/id/dist/index.js",
    import: "{ postalCode }",
    limit: "8 KB",   // baseline ~5-6 KB, +35% headroom
    gzip: false,
    ignore: ["@idvalidator/core"],
  },

  // ============================================================================
  // Indonesia Address Data Package (@idvalidator/data-id-address)
  // ============================================================================
  {
    name: "@idvalidator/data-id-address - Base (sync API, district-level)",
    path: "packages/data-id-address/dist/index.js",
    limit: "55 KB",  // baseline ~30-35 KB, +40% headroom
    gzip: false,
    ignore: ["@idvalidator/core"],
  },
  // Note: Village data (~650 KB gzipped) is lazy-loaded via dynamic import()
  // and only loaded when async functions are called. This check verifies the
  // base bundle stays small.

  // ============================================================================
  // Global Validators
  // ============================================================================
  {
    name: "@idvalidator/global-email",
    path: "packages/global/email/dist/index.js",
    limit: "5 KB",   // baseline ~3 KB gzip, +40% headroom
    gzip: true,
  },
  {
    name: "@idvalidator/global-phone - Full",
    path: "packages/global/phone/dist/index.js",
    limit: "24 KB",  // baseline ~15-16 KB, +40% headroom
    gzip: false,
    ignore: ["@idvalidator/core"],
  },

  // ============================================================================
  // Large Data Files (tracked separately)
  // ============================================================================
  {
    name: "Village data (lazy-loaded) - GZIP",
    path: "packages/data-id-address/data/village-postal-index.json",
    limit: "900 KB", // baseline ~650 KB gzip, +38% headroom for data updates
    gzip: true,
  },
  {
    name: "Admin hierarchy data",
    path: "packages/data-id-address/data/admin-hierarchy.json",
    limit: "32 KB",  // baseline ~22-23 KB gzip, +40% headroom
    gzip: true,
  },
  {
    name: "Postal index data",
    path: "packages/data-id-address/data/postal-index.json",
    limit: "20 KB",  // baseline ~13-14 KB gzip, +40% headroom
    gzip: true,
  },
  {
    name: "Indonesia regions data (embedded in idvalidator-id)",
    path: "packages/id/data/regions.json",
    limit: "16 KB",  // baseline ~11-12 KB gzip, +35% headroom
    gzip: true,
  },
  {
    name: "Phone calling codes data",
    path: "packages/global/phone/data/calling-codes.json",
    limit: "13 KB",  // baseline ~8-9 KB gzip, +40% headroom
    gzip: true,
  },
];
