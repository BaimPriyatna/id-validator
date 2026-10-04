#!/usr/bin/env node
// Publishes only the workspace packages whose version is ahead of what is
// already on the registry, in dependency order.
//
// Why this exists: release.yml used to publish every package unconditionally.
// Once a package's version has not been bumped, `npm publish` fails with
// EPUBLISHCONFLICT, the step exits non-zero, and every package listed after it
// is silently never published. Selecting by version delta makes a release that
// bumps a single package work, and keeps a tag-only release a no-op instead of
// a red build.
//
// Order is derived from the workspace dependency graph rather than hardcoded,
// so adding a package (or a dependency between them) cannot silently publish a
// dependent before the dependency it requires is on the registry.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// `npm` is a .cmd shim on Windows, which execFileSync cannot spawn directly
// (ENOENT without an extension, EINVAL with one). Every arg passed to npmRun
// below is a fixed internal string, never user input, so the shell form is only
// a launcher on Windows and nothing is interpolated.
function npmRun(args, opts = {}) {
  return execFileSync('npm', args, {
    encoding: 'utf8',
    ...opts,
    ...(process.platform === 'win32' ? { shell: true } : {}),
  });
}

/** Workspace globs, mirroring the "workspaces" array in the root package.json. */
const WORKSPACE_GLOBS = ['packages/core', 'packages/global/*', 'packages/id', 'packages/data-id-address'];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Expand the workspace globs to a list of { dir, name, version, deps }. */
function collectWorkspaces() {
  const dirs = [];
  for (const glob of WORKSPACE_GLOBS) {
    if (glob.endsWith('/*')) {
      const base = join(root, glob.slice(0, -2));
      for (const entry of readdirSafe(base)) {
        if (isDir(join(base, entry))) dirs.push(join(base, entry));
      }
    } else {
      dirs.push(join(root, glob));
    }
  }
  const seen = new Set();
  return dirs
    .filter((dir) => isDir(dir) && !seen.has(dir) && seen.add(dir))
    // A directory under a workspace glob is not automatically a workspace
    // package: packages/global/country-code is tracked in git but has no
    // package.json, so npm ignores it. Require one rather than throwing.
    .filter((dir) => {
      if (existsSync(join(dir, 'package.json'))) return true;
      console.warn(`  WARN  skipping ${dir.slice(root.length + 1).split('\\').join('/')}: no package.json`);
      return false;
    })
    .map((dir) => {
      const pkg = readJson(join(dir, 'package.json'));
      return {
        dir,
        rel: dir.slice(root.length + 1).split('\\').join('/'),
        name: pkg.name,
        version: pkg.version,
        deps: {
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.peerDependencies,
          ...pkg.optionalDependencies,
        },
      };
    });
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// Sanity-check the ordering logic itself: every intra-workspace dependency must
// appear before its dependent. Cheaper to catch a bad sort here than to publish
// a dependent that references a dependency not yet on the registry.
function assertOrderValid(packages) {
  const seen = new Set();
  for (const pkg of packages) {
    for (const dep of Object.keys(pkg.deps)) {
      if (!packages.some((p) => p.name === dep) || dep === pkg.name) continue;
      if (!seen.has(dep)) {
        throw new Error(`Topological sort put ${pkg.name} before its dependency ${dep}`);
      }
    }
    seen.add(pkg.name);
  }
}

/**
 * Version already published on npm, or null when the package is genuinely
 * unpublished. A spawn/network failure is a hard error, never a "not published"
 * answer: silently treating a failed lookup as unpublished would republish
 * every package and fail the release with EPUBLISHCONFLICT.
 */
function registryVersion(name) {
  try {
    return npmRun(['view', `${name}@latest`, 'version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    const stderr = String(err.stderr ?? '');
    // E404 is npm's "no such package" answer, and is the only case that means
    // "not published".
    if (/\bE404\b/.test(stderr)) return null;
    throw new Error(
      `Could not read the published version of ${name} from the registry. ` +
        `Refusing to guess, because treating this as "not published" would try to ` +
        `republish every package. Underlying error: ${stderr.trim() || err.message}`
    );
  }
}

/** Numeric-ish comparison of two semver strings; -1/0/1. */
function compareVersions(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

/**
 * Kahn topological sort over the intra-workspace dependency edges, so a
 * package is always published after everything it depends on.
 */
function topoSort(packages) {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const indegree = new Map(packages.map((p) => [p.name, 0]));
  const dependents = new Map(packages.map((p) => [p.name, []]));

  for (const pkg of packages) {
    for (const dep of Object.keys(pkg.deps)) {
      if (!byName.has(dep) || dep === pkg.name) continue;
      indegree.set(pkg.name, indegree.get(pkg.name) + 1);
      dependents.get(dep).push(pkg.name);
    }
  }

  const queue = packages.filter((p) => indegree.get(p.name) === 0).map((p) => p.name);
  const sorted = [];
  while (queue.length) {
    const name = queue.shift();
    sorted.push(byName.get(name));
    for (const next of dependents.get(name)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }

  if (sorted.length !== packages.length) {
    const stuck = packages.filter((p) => !sorted.includes(p)).map((p) => p.name);
    throw new Error(`Dependency cycle between workspace packages: ${stuck.join(', ')}`);
  }
  return sorted;
}

function publish(pkg) {
  console.log(`\n>>> npm publish ${pkg.name}@${pkg.version} (${pkg.rel})`);
  npmRun(['publish', '--workspace', pkg.rel, '--access', 'public', '--provenance'], {
    stdio: 'inherit',
    env: process.env,
  });
}

const workspaces = collectWorkspaces();
if (workspaces.length === 0) throw new Error('No workspace packages found');
const ordered = topoSort(workspaces);
assertOrderValid(ordered);

// A CLI flag, not just DRY_RUN=1: an env-var prefix is POSIX-shell syntax and
// npm scripts run under cmd.exe on Windows, where `DRY_RUN=1 node ...` fails.
const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

console.log(`Checking ${workspaces.length} workspace package(s) against the registry:\n`);
const pending = [];
for (const pkg of ordered) {
  const published = registryVersion(pkg.name);
  const cmp = published === null ? 1 : compareVersions(pkg.version, published);
  const status = published === null ? 'NEW' : cmp > 0 ? 'BUMP' : cmp === 0 ? 'CURRENT' : 'BEHIND';
  console.log(`  ${status.padEnd(8)} ${pkg.name}@${pkg.version}${published ? ` (registry ${published})` : ' (not published)'}`);
  if (cmp > 0) pending.push(pkg);
}

if (pending.length === 0) {
  // Not an error: re-tagging an already released state should not fail CI.
  console.log('\nNothing to publish -- every package is already at its registry version.');
  process.exit(0);
}

if (dryRun) {
  console.log(`\n--dry-run, would publish ${pending.length} package(s): ${pending.map((p) => p.name).join(', ')}`);
  process.exit(0);
}

for (const pkg of pending) publish(pkg);
console.log(`\nPublished ${pending.length} package(s): ${pending.map((p) => `${p.name}@${p.version}`).join(', ')}`);