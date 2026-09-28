---
name: Data Update Check
about: Quarterly check for upstream reference data updates
title: '[DATA] Q[QUARTER] [YEAR] - Reference Data Update Check'
labels: data, maintenance
assignees: ''
---

## Upstream Data Sources to Check

This is a quarterly reminder to check if any official reference datasets have been updated and need to be synchronized.

### Indonesia (`idvalidator-id` + `@idvalidator/data-id-address`)

#### 1. Province/Regency Codes (Kepmendagri)
- [ ] **Source:** Kepmendagri (Kementerian Dalam Negeri) official publications
- [ ] **Current version:** Kepmendagri No. 300.2.2-2430 Tahun 2025
- [ ] **Check:** [Kepmendagri official site](https://www.kemendagri.go.id/) or [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (MIT)
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- New version number: __________
- Breaking changes: ⬜ Yes / ⬜ No
- Files to update: `packages/id/data/regions.json`, `packages/data-id-address/data/admin-hierarchy.json`

---

#### 2. District Codes (Kepmendagri via lokabisa-oss/region-id)
- [ ] **Source:** [lokabisa-oss/region-id](https://github.com/lokabisa-oss/region-id) (MIT)
- [ ] **Current version:** Kepmendagri No. 300.2.2-2430 Tahun 2025
- [ ] **Check:** Upstream repository commits and releases
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- Files to update: `packages/data-id-address/data/admin-hierarchy.json`
- Run: `npm run build:data:village` (if village dataset also needs updating)

---

#### 3. Postal Codes (Kepmendagri via cahyadsn/wilayah_kodepos)
- [ ] **Source:** [cahyadsn/wilayah_kodepos](https://github.com/cahyadsn/wilayah_kodepos) (MIT)
- [ ] **Current version:** Kepmendagri No. 300.2.2-3128 Tahun 2025
- [ ] **Check:** Upstream repository commits and releases
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- Files to update: `packages/data-id-address/data/postal-index.json`

---

#### 4. Village Data (Kepmendagri via cahyadsn/wilayah)
- [ ] **Source:** [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) `db/wilayah.sql` (MIT)
- [ ] **Current version:** Kepmendagri No. 300.2.2-2138 Tahun 2025
- [ ] **Check:** Upstream repository commits and database dumps
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- Run: `npm run build:data:village` to regenerate
- Files updated: `packages/data-id-address/data/village-postal-index.json`
- ⚠️ Large file (~650 KB gzipped) — verify bundle size after update

---

#### 5. Vehicle Plate Region Codes (Community-sourced)
- [ ] **Source:** Community-contributed (NOT OFFICIAL — see data/plate-region-codes.json metadata)
- [ ] **Check:** Public news sources, user reports, GitHub issues
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update reported / ⬜ Needs investigation

**If updated:**
- Files to update: `packages/data-id-address/data/plate-region-codes.json`
- ⚠️ Update `meta.source` field to document source of change
- Note: This remains flagged as **not officially verified**

---

### Global Validators

#### 6. Country Codes (ISO 3166-1)
- [ ] **Source:** [ISO 3166-1 alpha-2/alpha-3](https://www.iso.org/iso-3166-country-codes.html)
- [ ] **Check:** [IANA assignments](https://www.iana.org/assignments/language-subtag-registry) or Wikipedia mirrors
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- Files to update: `packages/global/country-code/src/index.ts`

---

#### 7. Currency Codes (ISO 4217)
- [ ] **Source:** [ISO 4217](https://www.iso.org/iso-4217-currency-codes.html)
- [ ] **Check:** [Six Group Currency Codes](https://www.six-group.com/en/products-services/financial-information/data-standards.html)
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- Files to update: `packages/global/currency/src/index.ts`

---

#### 8. Phone Calling Codes (ITU-T E.164)
- [ ] **Source:** [ITU-T E.164 assignments](https://www.itu.int/oth/T0202.aspx)
- [ ] **Check:** ITU operational bulletins or Wikipedia mirrors
- [ ] **Last updated in repo:** _[fill date from git log]_
- [ ] **Status:** ⬜ No update needed / ⬜ Update available / ⬜ Needs investigation

**If updated:**
- Files to update: `packages/global/phone/data/calling-codes.json`

---

## Post-Update Checklist

If ANY data was updated:

- [ ] Run full test suite: `npm test`
- [ ] Run type checking: `npm run typecheck`
- [ ] Check bundle sizes: `npm run size` (if size-limit is configured)
- [ ] Update `CHANGELOG.md` with data source version changes
- [ ] Update version metadata in affected package.json files
- [ ] Update `REFERENCE.md` if data structure or coverage changed
- [ ] Create PR with title: `data: update [source] to [version/date]`

---

## No Updates Found?

If no updates are needed:
- [ ] Close this issue with comment: "Checked [date] — all sources current as of [versions above]"
- [ ] Next check due: _[3 months from today]_

---

## Notes

- **Frequency:** Check quarterly (every 3 months) or when notified of upstream changes
- **Automation:** This issue is created automatically by `.github/workflows/data-update-reminder.yml`
- **Responsibility:** Maintainers should check sources and update this checklist
- **Breaking changes:** If a Kepmendagri revision reorganizes province/regency/district codes, consider bumping major version

**Related docs:**
- [REFERENCE.md](../../REFERENCE.md) — data source documentation
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — data handling patterns
- `scripts/build-village-data.mjs` — village data build script
