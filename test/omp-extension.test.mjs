import test from 'node:test';
import assert from 'node:assert/strict';
import extension from '../src/omp-extension.mjs';

function host(options) {
  const commands = new Map();
  const messages = [];
  extension({ registerCommand: (name, command) => commands.set(name, command) }, options);
  assert.deepEqual([...commands.keys()], ['rustxng-install']);
  return {
    run: (args = '') =>
      commands
        .get('rustxng-install')
        .handler(args, { ui: { notify: (...message) => messages.push(message) } }),
    messages,
  };
}

test('OMP loads without MCP registration and only downloads on explicit command', async () => {
  let installs = 0;
  const h = host({
    env: {},
    install: async () => {
      installs++;
      return { reused: false };
    },
  });
  assert.equal(installs, 0);
  await h.run();
  assert.equal(installs, 1);
  assert.match(h.messages.at(-1)[0], /Restart OMP or run \/mcp reload/);
  assert.doesNotMatch(h.messages.at(-1)[0], /connected|registration is ready/);
});

test('OMP rejects arguments and every defined binary override before downloading', async () => {
  for (const override of ['', 'relative', '/absolute/path', undefined]) {
    const h = host({
      env: { PI_RUSTXNG_BIN: override },
      install: () => assert.fail('Unexpected download'),
    });
    await h.run('--latest');
    assert.match(h.messages.at(-1)[0], /Usage/);
    if (override !== undefined) {
      await h.run();
      assert.match(h.messages.at(-1)[0], /unset the override/);
    }
  }
});

test('OMP serializes installation and allows retry after failure', async () => {
  let finish;
  let attempts = 0;
  const h = host({
    env: {},
    install: async () => {
      if (++attempts === 1)
        await new Promise((_resolve, reject) => {
          finish = reject;
        });
      return { reused: true };
    },
  });
  const first = h.run();
  await h.run();
  assert.equal(attempts, 1);
  assert.match(h.messages.at(-1)[0], /already running/);
  finish(new Error('checksum failed'));
  await first;
  assert.deepEqual(h.messages.at(-1), ['RustXNG setup failed: checksum failed', 'error']);
  await h.run();
  assert.equal(attempts, 2);
  assert.match(h.messages.at(-1)[0], /Verified RustXNG/);
});
