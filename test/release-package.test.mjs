import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTag, validatePackage, validateEntries } from '../scripts/release-package.mjs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
test('release accepts only matching stable tags', () => {
  validateTag('v0.1.0', '0.1.0');
  for (const tag of ['main', 'v0.2.0', 'v0.1.0-beta', 'v0.1.0\n'])
    assert.throws(() => validateTag(tag, '0.1.0'));
  assert.throws(() => validateTag('v0.1.0-beta', '0.1.0-beta'));
});
test('release rejects changed identity and lifecycle scripts', () => {
  validatePackage(pkg);
  assert.throws(() => validatePackage({ ...pkg, name: 'other' }));
  assert.throws(() => validatePackage({ ...pkg, scripts: { postinstall: 'run' } }));
});
test('release archive allowlist rejects secrets and traversal', () => {
  for (const entry of [
    'package/.npmrc',
    '../escape',
    'package/ai/log.md',
    'package/scripts/check.mjs',
  ])
    assert.throws(() => validateEntries([entry]));
});
test('release publication stays tag-only and OIDC is scoped to publish job', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/release.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /tags: \['v\*'\]/);
  assert.doesNotMatch(workflow, /workflow_dispatch|pull_request_target|NODE_AUTH_TOKEN/);
  assert.equal((workflow.match(/id-token: write/g) || []).length, 1);
  assert.match(
    workflow,
    /publish:[\s\S]*needs: check[\s\S]*environment: release[\s\S]*id-token: write/,
  );
});
