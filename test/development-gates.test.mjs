import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const hooksInstaller = fileURLToPath(new URL('../scripts/install-hooks.mjs', import.meta.url));
const secretsScanner = fileURLToPath(new URL('../scripts/secrets-check.mjs', import.meta.url));
async function fixture(t, scanCode = 0, version = '8.30.1') {
  const root = await mkdtemp(join(tmpdir(), 'pi-gates-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  const executable = join(root, 'gitleaks');
  await writeFile(
    executable,
    `#!/bin/sh\nif [ "$1" = version ]; then echo '${version}'; exit 0; fi\nexit ${scanCode}\n`,
  );
  await chmod(executable, 0o700);
  return { root, executable };
}
function run(script, root, args = [], env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}
test('hook setup preserves unrelated existing hooks', async (t) => {
  const { root, executable } = await fixture(t);
  await writeFile(join(root, '.git/hooks/commit-msg'), '#!/bin/sh\nexit 0\n');
  const result = run(hooksInstaller, root, [executable]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing Git hooks are preserved/);
  assert.equal(
    spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd: root }).status,
    1,
  );
});
test('hook setup preserves configured hook paths', async (t) => {
  const { root, executable } = await fixture(t);
  spawnSync('git', ['config', '--local', 'core.hooksPath', 'custom-hooks'], { cwd: root });
  assert.notEqual(run(hooksInstaller, root, [executable]).status, 0);
  assert.equal(
    spawnSync('git', ['config', '--get', 'core.hooksPath'], {
      cwd: root,
      encoding: 'utf8',
    }).stdout.trim(),
    'custom-hooks',
  );
});
test('hook setup installs explicitly and is repeatable', async (t) => {
  const { root, executable } = await fixture(t);
  await mkdir(join(root, '.githooks'));
  for (const name of ['pre-commit', 'pre-push'])
    await writeFile(join(root, '.githooks', name), '#!/bin/sh\nexit 0\n');
  assert.equal(run(hooksInstaller, root, [executable]).status, 0);
  assert.equal(run(hooksInstaller, root, [executable]).status, 0);
});
test('secrets scanner propagates findings and rejects absent tools', async (t) => {
  const { root, executable } = await fixture(t, 1);
  assert.equal(run(secretsScanner, root, [], { GITLEAKS_BIN: executable }).status, 1);
  const absent = run(secretsScanner, root, [], { GITLEAKS_BIN: join(root, 'absent') });
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /Gitleaks 8.30.1 is required/);
});
test('secrets scanner rejects unexpected tool versions', async (t) => {
  const { root, executable } = await fixture(t, 0, '0.0.0');
  assert.equal(run(secretsScanner, root, [], { GITLEAKS_BIN: executable }).status, 1);
});

test('hook setup handles repositories without template hooks', async (t) => {
  const { root, executable } = await fixture(t);
  await rm(join(root, '.git/hooks'), { recursive: true });
  await mkdir(join(root, '.githooks'));
  for (const name of ['pre-commit', 'pre-push'])
    await writeFile(join(root, '.githooks', name), '#!/bin/sh\nexit 0\n');
  assert.equal(run(hooksInstaller, root, [executable]).status, 0);
});
