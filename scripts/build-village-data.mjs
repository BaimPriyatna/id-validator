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
 * Pinned to specific commits, not master/main HEAD, so re-running this
 * later reproduces the exact same output rather than silently picking up
 * whatever upstream has changed to since. To intentionally pick up new
 * upstream data: check the latest commit on each repo's default branch,
 * update the two SHAs below, then re-run -- the cross-validation against
 * admin-hierarchy.json (see checkDistrictsMatchAdminHierarchy) will fail
 * loudly if the new data's district codes have drifted from what
 * admin-hierarchy.json currently has (e.g. a Kepmendagri revision that
 * split/merged/renumbered a region), instead of writing a dataset that
 * would silently misjoin with the rest of this package.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const WILAYAH_COMMIT = "0d1237a5eef926629c69d287cf2282006144f4fa";
const WILAYAH_KODEPOS_COMMIT = "ba8497156c5cc9bcbfc527f7b8875d403eda2354";
const WILAYAH_SQL_URL = `https://raw.githubusercontent.com/cahyadsn/wilayah/${WILAYAH_COMMIT}/db/wilayah.sql`;
const KODEPOS_JSON_URL = `https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/${WILAYAH_KODEPOS_COMMIT}/json/wilayah_kodepos.min.json`;
const OUTPUT_PATH = fileURLToPath(
  new URL("../packages/data-id-address/data/village-postal-index.json", import.meta.url),
);
const ADMIN_HIERARCHY_PATH = fileURLToPath(
  new URL("../packages/data-id-address/data/admin-hierarchy.json", import.meta.url),
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

function loadAdminDistrictKeys() {
  const admin = JSON.parse(readFileSync(ADMIN_HIERARCHY_PATH, "utf8"));
  return new Set(admin.districts.map((d) => `${d.provinceCode}:${d.regencyCode}:${d.code}`));
}

/**
 * Guards against silently shipping a village dataset whose district codes
 * no longer line up with admin-hierarchy.json (the source every lookup in
 * this package resolves province/regency/district names through). A drift
 * here means a village would resolve to a district that doesn't exist
 * elsewhere in the package, or vice versa -- almost always caused by an
 * upstream boundary change (region split/merge/renumbering) landing in one
 * source but not the other yet.
 */
function checkDistrictsMatchAdminHierarchy(villageDistrictKeys) {
  const adminKeys = loadAdminDistrictKeys();
  const onlyInVillageData = [...villageDistrictKeys].filter((k) => !adminKeys.has(k));
  const onlyInAdminData = [...adminKeys].filter((k) => !villageDistrictKeys.has(k));

  if (onlyInVillageData.length > 0 || onlyInAdminData.length > 0) {
    throw new Error(
      "District codes no longer match admin-hierarchy.json exactly -- refusing to write a " +
        "dataset that would silently misjoin with the rest of this package.\n" +
        `${onlyInVillageData.length} district(s) only in the new village data` +
        (onlyInVillageData.length > 0 ? ` (e.g. ${onlyInVillageData.slice(0, 5).join(", ")})` : "") +
        `.\n${onlyInAdminData.length} district(s) only in admin-hierarchy.json` +
        (onlyInAdminData.length > 0 ? ` (e.g. ${onlyInAdminData.slice(0, 5).join(", ")})` : "") +
        ".\nThis usually means upstream boundaries changed (a regency/district split, merge, " +
        "or renumbering) in one source but not the other -- admin-hierarchy.json likely needs " +
        "to be regenerated from the same upstream revision before this script can produce a " +
        "consistent dataset.",
    );
  }
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

  checkDistrictsMatchAdminHierarchy(new Set(Object.keys(byDistrict)));

  const dataset = {
    meta: {
      version: "kepmendagri-300.2.2-2138-2025",
      source:
        `github.com/cahyadsn/wilayah@${WILAYAH_COMMIT} (db/wilayah.sql) + ` +
        `github.com/cahyadsn/wilayah_kodepos@${WILAYAH_KODEPOS_COMMIT} ` +
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
