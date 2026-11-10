import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installRelease, installRustxng, verifyBytes, verifySidecar } from '../src/install.mjs';
import { selectArtifact, RELEASE_URL, TARGETS, VERSION } from '../src/release.mjs';

const bytes = Buffer.from('fixture executable');
const artifact = {
  name: 'fixture',
  size: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
};
const legal = Buffer.from('fixture legal notice');
const legalArtifact = {
  name: 'NOTICE',
  size: legal.length,
  sha256: createHash('sha256').update(legal).digest('hex'),
};
const responses = new Map([
  [`${RELEASE_URL}/fixture.sha256`, `${artifact.sha256}  fixture\n`],
  [`${RELEASE_URL}/fixture`, bytes],
  [`${RELEASE_URL}/NOTICE`, legal],
]);
const fixtureFetch = async (url) =>
  new Response(responses.get(url) ?? '', { status: responses.has(url) ? 200 : 404 });

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'pi-rustxng-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    directory: join(root, VERSION),
    artifact,
    platform: process.platform,
    legalFiles: [legalArtifact],
    fetchImpl: fixtureFetch,
  };
}

test('selects pinned official assets and rejects unsupported platforms', () => {
  assert.match(selectArtifact('darwin', 'arm64').name, /aarch64-apple-darwin$/);
  assert.match(selectArtifact('darwin', 'x64').name, /x86_64-apple-darwin$/);
  assert.match(selectArtifact('linux', 'x64').name, /unknown-linux-musl$/);
  assert.match(selectArtifact('linux', 'arm64').name, /aarch64-unknown-linux-gnu$/);
  assert.match(selectArtifact('win32', 'x64').name, /windows-msvc.exe$/);
  assert.equal(Object.keys(TARGETS).length, 5);
  assert.throws(() => selectArtifact('win32', 'arm64'), /Unsupported/);
});

test('checks size, SHA-256, and the sidecar filename', () => {
  verifyBytes(bytes, artifact);
  assert.throws(() => verifyBytes(Buffer.alloc(bytes.length - 1), artifact), /Size mismatch/);
  assert.throws(() => verifyBytes(Buffer.alloc(bytes.length), artifact), /SHA-256/);
  verifySidecar(Buffer.from(`${artifact.sha256}  fixture\n`), artifact);
  assert.throws(
    () => verifySidecar(Buffer.from(`${artifact.sha256}  other\n`), artifact),
    /sidecar mismatch/,
  );
  assert.throws(
    () => verifySidecar(Buffer.from(`${'0'.repeat(64)}  fixture\n`), artifact),
    /sidecar mismatch/,
  );
});

test('installs verified files together and reuses a complete install without network', async (t) => {
  const options = await fixture(t);
  const result = await installRelease(options);
  assert.equal(result.reused, false);
  assert.deepEqual(await readFile(result.command), bytes);
  assert.deepEqual(await readFile(join(options.directory, 'NOTICE')), legal);
  const repeated = await installRelease({
    ...options,
    fetchImpl: () => {
      throw new Error('Unexpected network');
    },
  });
  assert.equal(repeated.reused, true);
  assert.deepEqual(await readdir(options.root), [VERSION]);
});

test('failed download cleans staging and can be retried', async (t) => {
  const options = await fixture(t);
  await assert.rejects(
    installRelease({ ...options, fetchImpl: async () => new Response('', { status: 503 }) }),
    /Download failed/,
  );
  assert.deepEqual(await readdir(options.root), []);
  assert.equal((await installRelease(options)).reused, false);
});

test('corruption, oversized streams, and corrupt legal files never publish an install', async (t) => {
  const options = await fixture(t);
  for (const [name, content, expected] of [
    ['fixture', Buffer.alloc(bytes.length), /SHA-256/],
    ['fixture', Buffer.alloc(bytes.length + 1), /too large/],
    ['NOTICE', Buffer.alloc(legal.length), /SHA-256/],
  ]) {
    await assert.rejects(
      installRelease({
        ...options,
        fetchImpl: async (url) =>
          url.endsWith(`/${name}`) ? new Response(content) : fixtureFetch(url),
      }),
      expected,
    );
    assert.deepEqual(await readdir(options.root), []);
  }
});

test('an invalid existing destination is preserved and never overwritten', async (t) => {
  const options = await fixture(t);
  await mkdir(options.directory);
  await writeFile(join(options.directory, 'keep'), 'existing data');
  await assert.rejects(
    installRelease({
      ...options,
      fetchImpl: async () => {
        throw new Error('Network must not run');
      },
    }),
    /Move it aside/,
  );
  assert.equal(await readFile(join(options.directory, 'keep'), 'utf8'), 'existing data');
});

test('unsupported targets never download or create files', async (t) => {
  const { directory, root } = await fixture(t);
  await assert.rejects(
    installRustxng({ directory, platform: 'unknown', arch: 'x64', fetchImpl: fixtureFetch }),
    /Unsupported/,
  );
  assert.deepEqual(await readdir(root), []);
});
