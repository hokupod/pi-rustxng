import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir, platform, arch } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateSafeChainExecutable, assertSafeChainUnchanged } from '../scripts/safe-chain.mjs';
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'pi-safe-chain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'safe-chain');
  const content = '#!/bin/sh\necho "Current safe-chain version: test"\n';
  await writeFile(executable, content);
  await chmod(executable, 0o700);
  const policy = {
    safeChain: {
      version: 'test',
      sha256: { [`${platform()}-${arch()}`]: createHash('sha256').update(content).digest('hex') },
    },
  };
  return { root, executable, policy };
}
test('safe-chain accepts exact digest and version, then detects replacement', async (t) => {
  const { executable, policy } = await fixture(t);
  const resolved = await validateSafeChainExecutable(executable, policy);
  assert.equal(resolved.version, 'test');
  await writeFile(executable, 'different');
  await assert.rejects(assertSafeChainUnchanged(executable, resolved.identity), /changed/);
});
test('safe-chain refuses unverified content and symlinks before execution', async (t) => {
  const { root, executable, policy } = await fixture(t);
  policy.safeChain.sha256[`${platform()}-${arch()}`] = '0'.repeat(64);
  await assert.rejects(validateSafeChainExecutable(executable, policy), /digest mismatch/);
  const link = join(root, 'link');
  await symlink(executable, link);
  await assert.rejects(validateSafeChainExecutable(link, policy), /symbolic link/);
});
test('safe-chain refuses unsupported platforms and unexpected version', async (t) => {
  const { executable, policy } = await fixture(t);
  policy.safeChain.version = 'other';
  await assert.rejects(validateSafeChainExecutable(executable, policy), /required/);
  policy.safeChain.sha256 = {};
  await assert.rejects(validateSafeChainExecutable(executable, policy), /no approved digest/);
});

test('project Safe-chain policy and CI use the same isolated release', async () => {
  const policy = JSON.parse(
    await readFile(new URL('../toolchain-policy.json', import.meta.url), 'utf8'),
  );
  const bootstrap = await readFile(
    new URL('../.github/actions/setup-checks/action.yml', import.meta.url),
    'utf8',
  );
  const expected = `.local/share/pi-rustxng/tools/safe-chain/${policy.safeChain.version}/safe-chain`;
  assert.equal(policy.safeChain.relativeExecutable, expected);
  assert.equal(policy.safeChain.allowEnvironmentOverride, false);
  assert.ok(bootstrap.includes(`$HOME/${expected}`));
  assert.ok(
    bootstrap.includes(
      `/download/${policy.safeChain.version}/${policy.safeChain.assets['linux-x64']}`,
    ),
  );
  assert.ok(bootstrap.includes(policy.safeChain.sha256['linux-x64']));
  assert.ok(!bootstrap.includes('$HOME/.safe-chain/bin'));
});
