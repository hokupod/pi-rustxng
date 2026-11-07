import { spawnSync } from 'node:child_process';
import { readdirSync, chmodSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
const policy = JSON.parse(readFileSync(new URL('../toolchain-policy.json', import.meta.url)));
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Git failed: ${args[0]}`);
  return result.stdout.trim();
}
const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
if (current.status !== 0 && current.status !== 1) throw new Error('Cannot inspect existing hooks');
if (current.stdout.trim() && current.stdout.trim() !== '.githooks')
  throw new Error('Existing hooksPath is preserved; integrate the checks manually.');
if (!current.stdout.trim()) {
  const hooks = git(['rev-parse', '--git-path', 'hooks']);
  let entries;
  try {
    entries = readdirSync(hooks);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    entries = [];
  }
  const active = entries.filter((name) => !name.endsWith('.sample'));
  if (active.length) throw new Error('Existing Git hooks are preserved; integrate manually.');
}
const executable = process.argv[2];
if (process.argv.length !== 3 || !isAbsolute(executable))
  throw new Error('Usage: node scripts/install-hooks.mjs /absolute/path/to/gitleaks');
const version = spawnSync(executable, ['version'], { encoding: 'utf8' });
if (version.status !== 0 || version.stdout.trim() !== policy.gitleaksVersion)
  throw new Error(`Gitleaks ${policy.gitleaksVersion} is required`);
for (const name of ['pre-commit', 'pre-push']) chmodSync(join('.githooks', name), 0o755);
git(['config', '--local', 'piRustxng.gitleaks', executable]);
git(['config', '--local', 'core.hooksPath', '.githooks']);
console.log('Installed repository-local pre-commit and pre-push checks.');
