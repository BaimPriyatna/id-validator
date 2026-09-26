## Summary

Briefly describe what this PR does and why.

## Type of change

- [ ] Bug fix
- [ ] New validator / domain
- [ ] New country or global package
- [ ] Docs / examples only
- [ ] Refactor / chore (no behavior change)
- [ ] Release prep (version bump + CHANGELOG)

## Checklist

- [ ] Tests added or updated (valid, invalid, normalization, and regression cases as relevant)
- [ ] `npm test` and `npm run typecheck` pass locally
- [ ] `REFERENCE.md` updated if validator behavior or limitations changed
- [ ] `ERROR-CODES.md` updated if error codes were added or changed
- [ ] `CHANGELOG.md` `[Unreleased]` (or release section) updated for user-facing changes
- [ ] Package / API follows the domain-first shape (`validate` / `normalize` / `parse` / `format` as relevant)
- [ ] Docs state what the change does **not** validate (no implied official verification)
- [ ] Hot-path / perf-sensitive changes: re-ran `npm run bench:throughput` (or `npm run bench`) and updated `BENCHMARKS.md` / `benchmarks/baseline.json` if needed

## Related issues

Closes #
