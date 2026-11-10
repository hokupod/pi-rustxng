import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  VERSION,
  RELEASE_URL,
  TARGETS,
  LEGAL_FILES,
  installDirectory,
  binaryName,
} from '../src/release.mjs';
import { resolveBinary } from '../src/runtime.mjs';
import piExtension from '../src/extension.mjs';
import ompExtension from '../src/omp-extension.mjs';

test('release metadata consistently selects the pinned version and verified artifacts', () => {
  assert.equal(VERSION, 'v0.31.1');
  assert.equal(RELEASE_URL, `https://github.com/sahenjp/RustXNG/releases/download/${VERSION}`);
  assert.equal(
    installDirectory('/fixture'),
    join('/fixture', '.local', 'share', 'pi-rustxng', VERSION),
  );
  for (const artifact of Object.values(TARGETS)) {
    assert.ok(artifact.name.startsWith(`rustxng-${VERSION}-`));
  }
  for (const artifact of [...Object.values(TARGETS), ...LEGAL_FILES]) {
    assert.ok(Number.isSafeInteger(artifact.size) && artifact.size > 0);
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Object.isFrozen(artifact));
  }
});

test('both host installer descriptions and notifications use the pinned version', async () => {
  for (const extension of [piExtension, ompExtension]) {
    const commands = new Map();
    const messages = [];
    extension(
      {
        registerCommand: (name, command) => commands.set(name, command),
        registerMcpServer() {},
        on() {},
      },
      {
        env: {},
        home: '/nonexistent/pi-rustxng-test',
        install: () => {
          throw new Error('fixture stops before installation');
        },
      },
    );
    const command = commands.get('rustxng-install');
    assert.ok(command.description.includes(VERSION));
    await command.handler('', { ui: { notify: (...args) => messages.push(args) } });
    assert.deepEqual(messages[0], [
      `Downloading and verifying official RustXNG ${VERSION} from GitHub.`,
      'info',
    ]);
  }
});

test('managed binary resolution never falls back to the old pinned installation', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'pi-rustxng-upgrade-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const oldDirectory = join(home, '.local', 'share', 'pi-rustxng', 'v0.30.0');
  const oldBinary = join(oldDirectory, binaryName());
  await mkdir(oldDirectory, { recursive: true });
  await writeFile(oldBinary, 'old binary fixture');
  await chmod(oldBinary, 0o700);
  assert.throws(() => resolveBinary({}, home), /unavailable/);
  const command = join(installDirectory(home), binaryName());
  await mkdir(installDirectory(home), { recursive: true });
  await writeFile(command, 'new binary fixture');
  await chmod(command, 0o700);
  assert.equal(resolveBinary({}, home), command);
  assert.equal(await readFile(oldBinary, 'utf8'), 'old binary fixture');
});
