# Contributing

By participating, you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Reporting issues

Use the GitHub issue templates:

- **Bug report** — package + version, Node/runtime, minimal reproduction, expected vs actual
- **Feature request** — problem, proposed API, and any official specs/datasets

Security issues: follow [SECURITY.md](./SECURITY.md) (private advisory), not a public bug report.

## Pull requests

PRs use [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).
Before requesting review, make sure the checklist items that apply to your change
are checked — especially tests, `REFERENCE.md`, and stating what you do **not** validate.

```bash
npm install
npm run build
npm test
npm run typecheck
```

For performance-sensitive changes, also run `npm run bench:throughput` (and
optionally `npm run bench -- --compare benchmarks/baseline.json`). See
[BENCHMARKS.md](./BENCHMARKS.md).

## Adding a validator

Every validator must:
- Follow the domain-first API (`domain.validate()`, `.normalize()`, `.parse()`, `.format()` as relevant).
- Return `ValidationResult<T>` from `@idvalidator/core`.
- Use machine-readable error `code`s, not just messages.
- Ship valid-case, invalid-case, normalization, and regression tests.
- Document what it validates and, explicitly, what it does NOT validate.
- Update [REFERENCE.md](./REFERENCE.md) (and [ERROR-CODES.md](./ERROR-CODES.md) if you add codes).

## Adding a country package

- One country = one package (`id-validator-<cc>`).
- Depend only on `@idvalidator/core` and `packages/global/*`.
- Never depend on another country package.

## Adding/updating reference data

- Keep data in `data/*.json`, never hardcoded in validator logic.
- Include `source`, `version`, `updatedAt` metadata.
- Any format/regulation change needs a regression test.
- If a dataset can't be verified against an official, machine-readable
  source, ship it with an explicit heuristic/community-sourced label
  (see `sim`, `passport`, and `lookupPlateRegion` for the pattern) rather
  than presenting it at the same confidence level as sourced data.

## Releasing

### One-time setup

1. Create an npm Organization named exactly `id-validator` (npmjs.com ->
   profile -> Add Organization -> free plan) if it doesn't exist yet —
   the `@idvalidator/*` scope requires an org or user account with that
   exact name.
2. Create an npm **Granular Access Token** (classic/Automation tokens were
   removed by npm on 2025-11-05 — granular is the only option now):
   - Permissions: Read and write
   - Packages and scopes: "All Packages" for the very first publish (the
     packages don't exist yet, so they can't be individually selected —
     narrow this to just our packages once they exist)
   - Organizations: select `id-validator`
   - **Bypass 2FA: enabled** (off by default; required since this runs
     unattended in CI)
   - Expiration: npm now caps write-token lifetime at 90 days — there is
     no "never expires" option. **Set a reminder to regenerate this token
     and update the `NPM_TOKEN` secret before it expires**, or releases
     will start failing silently at the publish step.
3. Add the token as a repository secret named `NPM_TOKEN`
   (Settings -> Secrets and variables -> Actions).

### Cutting a release

1. Bump `version` in every `package.json` under `packages/` (and the internal
   `dependencies` versions in `packages/id/package.json` and the two
   `packages/global/*/package.json` files) to the same new version.
2. Update `CHANGELOG.md`: move `[Unreleased]` items under a new
   `## [x.y.z] - YYYY-MM-DD` heading.
3. Commit, then tag and push:
   ```bash
   git commit -am "Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```
4. Pushing the tag triggers `.github/workflows/release.yml`, which builds,
   tests, typechecks, and publishes `@idvalidator/core` ->
   `@idvalidator/global-phone`/`global-email` -> `idvalidator-id` ->
   `@idvalidator/data-id-address`, in that order (a package is never
   published before a workspace dependency it needs is already live), with
   `--provenance` attestation attached to each.

### Manual publish (no CI)

> [!NOTE]
> Manual publishes from your machine won't carry the `--provenance`
> attestation the CI release workflow generates (that needs GitHub
> Actions' OIDC token) — packages published this way just won't show the
> "Provenance" badge on npm. Everything else works the same.

```bash
npm ci
npm run build
npm test
npm publish --workspace packages/core --access public
npm publish --workspace packages/global/phone --access public
npm publish --workspace packages/global/email --access public
npm publish --workspace packages/id --access public
npm publish --workspace packages/data-id-address --access public
```

### Before the very first release

- Confirm the target npm account/org actually owns `idvalidator-id` and the
  `@idvalidator` scope.
- Double check `npm pack --dry-run` in each package you're about to publish;
  it should only list `dist/`, `data/` (where present), and `README.md`.
