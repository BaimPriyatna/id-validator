/**
 * Builds packages/data-id-address/data/village-postal-index.json from two
 * upstream MIT-licensed sources:
 *
 *   - github.com/cahyadsn/wilayah        (db/wilayah.sql)         -> village codes + names
 *   - github.com/cahyadsn/wilayah_kodepos (json/wilayah_kodepos.min.json) -> village code -> postal code
 *
 * Run manually when upstream data changes (not part of `npm run build` --
 * this is reference data, not a derivative of source code, same as
 * postal-index.json / admin-hierarchy.json / plate-region-codes.json):
 *
 *   node scripts/build-village-data.mjs
 *
 * Verifies its own join (every village must resolve to exactly one postal
 * code) and fails loudly rather than writing a partial/corrupt dataset.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const WILAYAH_SQL_URL = "https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql";
const KODEPOS_JSON_URL =
  "https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/main/json/wilayah_kodepos.min.json";
const OUTPUT_PATH = fileURLToPath(
  new URL("../packages/data-id-address/data/village-postal-index.json", import.meta.url),
);

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.json();
}

// Matches ('11.01.01.2001', 'Keude Bakongan') style rows at any depth
// (province/regency/district/village codes are 2, 5, 8, then 4-digit-suffix
// segments -- not uniformly 2 digits, hence the generic [0-9.]+).
const ROW_RE = /\('([0-9.]+)',\s*'((?:[^']|'')*)'\)/g;

function parseWilayahSql(sql) {
  const villages = [];
  let m;
  while ((m = ROW_RE.exec(sql))) {
    const parts = m[1].split(".");
    if (parts.length !== 4) continue; // province/regency/district rows already covered by admin-hierarchy.json
    villages.push({
      code: m[1],
      // SQL escapes a literal ' as '' -- undo that for the display name.
      name: m[2].replace(/''/g, "'"),
      provinceCode: parts[0],
      regencyCode: parts[1],
      districtCode: parts[2],
      villageCode: parts[3],
    });
  }
  return villages;
}

async function main() {
  console.log("Fetching wilayah.sql...");
  const sql = await fetchText(WILAYAH_SQL_URL);
  console.log("Fetching wilayah_kodepos.min.json...");
  const kodepos = await fetchJson(KODEPOS_JSON_URL);

  const villages = parseWilayahSql(sql);
  console.log(`Parsed ${villages.length} village rows.`);

  const byDistrict = {};
  const missing = [];
  for (const v of villages) {
    const postalCode = kodepos[v.code];
    if (!postalCode) {
      missing.push(v.code);
      continue;
    }
    const key = `${v.provinceCode}:${v.regencyCode}:${v.districtCode}`;
    (byDistrict[key] ??= []).push([v.villageCode, v.name, postalCode]);
  }

  if (missing.length > 0) {
    throw new Error(
      `${missing.length} village(s) have no postal code in wilayah_kodepos ` +
        `(e.g. ${missing.slice(0, 5).join(", ")}) -- refusing to write a partial dataset. ` +
        `Upstream data may have changed; investigate before re-running.`,
    );
  }

  const totalVillages = Object.values(byDistrict).reduce((sum, rows) => sum + rows.length, 0);
  if (totalVillages !== villages.length) {
    throw new Error("Internal error: row count changed during grouping.");
  }

  const dataset = {
    meta: {
      version: "kepmendagri-300.2.2-2138-2025",
      source:
        "github.com/cahyadsn/wilayah (db/wilayah.sql) + github.com/cahyadsn/wilayah_kodepos " +
        "(json/wilayah_kodepos.min.json), both MIT License",
      updatedAt: new Date().toISOString().slice(0, 10),
      note:
        "Village-level (desa/kelurahan) index, grouped by district: " +
        '{ "provinceCode:regencyCode:districtCode": [[villageCode, name, postalCode], ...] }. ' +
        "NOT a fix for reverse-lookup ambiguity -- see the package README before assuming " +
        "otherwise: 7.52% of postal codes genuinely span more than one district regardless of " +
        "granularity, and only ~17.56% of districts have any intra-district postal code " +
        "variation at all (the rest, e.g. Batujaya, share one code across every village).",
    },
    index: byDistrict,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(dataset));
  console.log(
    `Wrote ${OUTPUT_PATH} -- ${Object.keys(byDistrict).length} districts, ${totalVillages} villages.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
