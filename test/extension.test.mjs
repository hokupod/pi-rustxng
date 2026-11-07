import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import extension, { resolveBinary, serverConfig } from '../src/extension.mjs';
import { installDirectory, binaryName } from '../src/release.mjs';

async function fixture(t) {
  const home = await mkdtemp(join(tmpdir(), 'pi rustxng test '));
  t.after(() => rm(home, { recursive: true, force: true }));
  const command = join(installDirectory(home), binaryName());
  const createBinary = async () => {
    await mkdir(installDirectory(home), { recursive: true });
    await writeFile(command, 'This is not executable code. Factory must never spawn it.');
    await chmod(command, 0o700);
  };
  return { home, command, createBinary };
}

function host() {
  const registrations = [];
  const commands = new Map();
  const events = new Map();
  const messages = [];
  return {
    registrations,
    commands,
    events,
    messages,
    pi: {
      registerMcpServer: (...args) => registrations.push(args),
      registerCommand: (name, config) => commands.set(name, config),
      on: (name, handler) => events.set(name, handler),
    },
    ctx: { ui: { notify: (...args) => messages.push(args) } },
  };
}

test('registers native stdio config without spawning and preserves spaces', async (t) => {
  const { home, command, createBinary } = await fixture(t);
  await createBinary();
  const h = host();
  extension(h.pi, { env: {}, home });
  assert.equal(h.registrations.length, 1);
  const [name, config] = h.registrations[0];
  assert.equal(name, 'rustxng');
  assert.equal(config.command, command);
  assert.deepEqual(config.args.slice(0, 4), ['mcp', '--profile', 'standard', '--config']);
  assert.equal(isAbsolute(config.args[4]), true);
  assert.equal(config.exposure, 'direct');
  assert.equal(config.timeout, 60);
  assert.equal('shell' in config, false);
  assert.equal(resolveBinary({ PI_RUSTXNG_BIN: command }, home), command);
});

test('rejects relative, empty, missing, directory, and non-executable overrides', async (t) => {
  const { home, command, createBinary } = await fixture(t);
  assert.throws(() => resolveBinary({ PI_RUSTXNG_BIN: 'rustxng' }, home), /absolute/);
  assert.throws(() => resolveBinary({ PI_RUSTXNG_BIN: '' }, home), /absolute/);
  assert.throws(() => resolveBinary({}, home), /unavailable/);
  assert.throws(() => resolveBinary({ PI_RUSTXNG_BIN: home }, home), /unavailable/);
  await createBinary();
  await chmod(command, 0o600);
  if (process.platform !== 'win32') assert.throws(() => resolveBinary({}, home), /unavailable/);
});

test('missing installation loads, guides setup, and only installs on explicit command', async (t) => {
  const { home, createBinary, command } = await fixture(t);
  const h = host();
  let installs = 0;
  extension(h.pi, {
    env: {},
    home,
    install: async () => {
      installs++;
      await createBinary();
      return { command, reused: installs > 1 };
    },
  });
  assert.equal(installs, 0);
  assert.equal(h.registrations.length, 0);
  await h.events.get('session_start')({}, h.ctx);
  assert.match(h.messages[0][0], /rustxng-install/);
  await h.commands.get('rustxng-install').handler('', h.ctx);
  assert.equal(installs, 1);
  assert.equal(h.registrations.length, 1);
  await h.commands.get('rustxng-install').handler('', h.ctx);
  assert.equal(h.registrations.length, 1);
});

test('an explicit override is never silently replaced by installer', async (t) => {
  const { home } = await fixture(t);
  const h = host();
  extension(h.pi, {
    env: { PI_RUSTXNG_BIN: 'relative' },
    home,
    install: () => {
      throw new Error('Must not install');
    },
  });
  await h.commands.get('rustxng-install').handler('', h.ctx);
  assert.match(h.messages.at(-1)[0], /unset the override/);
  assert.equal(h.registrations.length, 0);
});

test('install errors are visible and retries can succeed', async (t) => {
  const { home, command, createBinary } = await fixture(t);
  const h = host();
  let attempt = 0;
  extension(h.pi, {
    env: {},
    home,
    install: async () => {
      if (++attempt === 1) throw new Error('checksum failure');
      await createBinary();
      return { command, reused: false };
    },
  });
  await h.commands.get('rustxng-install').handler('', h.ctx);
  assert.match(h.messages.at(-1)[0], /checksum failure/);
  assert.equal(h.registrations.length, 0);
  await h.commands.get('rustxng-install').handler('', h.ctx);
  assert.equal(h.registrations.length, 1);
});

test('requires native MCP registration support', () => {
  assert.throws(() => extension({}), /native MCP/);
  assert.equal(serverConfig('/bin with spaces/rustxng').command, '/bin with spaces/rustxng');
});

test('installer command rejects arguments before downloading', async (t) => {
  const { home } = await fixture(t);
  const h = host();
  extension(h.pi, {
    env: {},
    home,
    install: () => {
      throw new Error('Must not download');
    },
  });
  await h.commands.get('rustxng-install').handler('--latest', h.ctx);
  assert.equal(h.messages.at(-1)[0], 'Usage: /rustxng-install');
  assert.equal(h.registrations.length, 0);
});

test('concurrent install commands perform one download and one registration', async (t) => {
  const { home, command, createBinary } = await fixture(t);
  const h = host();
  let finish;
  let count = 0;
  const waiting = new Promise((resolve) => {
    finish = resolve;
  });
  extension(h.pi, {
    env: {},
    home,
    install: async () => {
      count++;
      await waiting;
      await createBinary();
      return { command, reused: false };
    },
  });
  const first = h.commands.get('rustxng-install').handler('', h.ctx);
  await h.commands.get('rustxng-install').handler('', h.ctx);
  assert.match(h.messages.at(-1)[0], /already running/);
  finish();
  await first;
  assert.equal(count, 1);
  assert.equal(h.registrations.length, 1);
});
