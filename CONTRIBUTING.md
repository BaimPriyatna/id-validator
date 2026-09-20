# Contributing

## Adding a validator

Every validator must:
- Follow the domain-first API (`domain.validate()`, `.normalize()`, `.parse()`, `.format()` as relevant).
- Return `ValidationResult<T>` from `@id-validator/core`.
- Use machine-readable error `code`s, not just messages.
- Ship valid-case, invalid-case, normalization, and regression tests.
- Document what it validates and, explicitly, what it does NOT validate.

## Adding a country package

- One country = one package (`id-validator-<cc>`).
- Depend only on `@id-validator/core` and `packages/global/*`.
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

1. Create an npm access token (Automation type) for an account/org that can
   publish `id-validator-id` and the `@id-validator/*` scope.
2. Add it as a repository secret named `NPM_TOKEN`
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
   tests, typechecks, and publishes `@id-validator/core` ->
   `@id-validator/global-phone`/`global-email` -> `id-validator-id` ->
   `@id-validator/data-id-address`, in that order (a package is never
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
npm publish --workspace packages/id
npm publish --workspace packages/data-id-address --access public
```

### Before the very first release

- Confirm the target npm account/org actually owns `id-validator-id` and the
  `@id-validator` scope.
- Double check `npm pack --dry-run` in each package you're about to publish;
  it should only list `dist/`, `data/` (where present), and `README.md`.
