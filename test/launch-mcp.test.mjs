import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const launcher = fileURLToPath(new URL('../scripts/launch-mcp.mjs', import.meta.url));
const config = fileURLToPath(new URL('../config/settings.toml', import.meta.url));

async function fixture(t, source, override) {
  const directory = await mkdtemp(join(tmpdir(), 'rustxng launcher spaces '));
  const binary = join(directory, 'rustxng fixture');
  await writeFile(
    binary,
    source ??
      `#!${process.execPath}
const readline = require('node:readline');
console.error(JSON.stringify({ pid: process.pid, args: process.argv.slice(2) }));
let count = 0;
readline.createInterface({ input: process.stdin }).on('line', line => {
  console.log(JSON.stringify({ request: JSON.parse(line), count: ++count }));
});
`,
  );
  await chmod(binary, 0o700);
  const child = spawn(process.execPath, [launcher], {
    env: { ...process.env, PI_RUSTXNG_BIN: override ?? binary },
    stdio: 'pipe',
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  child.stdin.on('error', () => {});
  const done = new Promise((resolve) =>
    child.on('close', (code, signal) => resolve({ code, signal })),
  );
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await done;
    const pid = Number(stderr.match(/"pid":(\d+)/)?.[1]);
    if (pid) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        assert.equal(error.code, 'ESRCH');
      }
    }
    await rm(directory, { recursive: true, force: true });
  });
  const until = async (predicate) => {
    for (let i = 0; i < 300; i++) {
      if (predicate()) return;
      await delay(10);
    }
    assert.fail(`Timed out. stderr=${stderr}, stdout=${stdout}`);
  };
  return { child, done, until, binary, stdout: () => stdout, stderr: () => stderr };
}

function assertGone(pid) {
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
}

test(
  'launcher preserves arguments, streams, and one stateful child across requests',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t);
    await f.until(() => f.stderr().includes('\n'));
    const { pid, args } = JSON.parse(f.stderr());
    assert.deepEqual(args, ['mcp', '--profile', 'standard', '--config', config]);
    f.child.stdin.write('{"id":1}\n');
    await f.until(() => f.stdout().includes('\n'));
    f.child.stdin.write('{"id":2}\n');
    await f.until(() => f.stdout().trim().split('\n').length === 2);
    assert.equal(f.stdout(), '{"request":{"id":1},"count":1}\n{"request":{"id":2},"count":2}\n');
    f.child.stdin.end();
    assert.deepEqual(await f.done, { code: 0, signal: null });
    assertGone(pid);
  },
);

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`launcher forwards ${signal} and propagates child status`, { timeout: 10000 }, async (t) => {
    const f = await fixture(
      t,
      `#!${process.execPath}\nprocess.on('${signal}', () => process.exit(23));\nconsole.error(JSON.stringify({pid:process.pid}));\nsetInterval(() => {}, 1000);\n`,
    );
    await f.until(() => f.stderr().includes('\n'));
    const { pid } = JSON.parse(f.stderr());
    f.child.kill(signal);
    assert.equal((await f.done).code, 23);
    assertGone(pid);
  });
}

for (const trigger of ['EOF', 'SIGTERM', 'SIGINT']) {
  test(`launcher bounds cleanup when child ignores ${trigger}`, { timeout: 10000 }, async (t) => {
    const f = await fixture(
      t,
      `#!${process.execPath}\nprocess.on('SIGTERM', () => {});\nprocess.on('SIGINT', () => {});\nprocess.stdin.resume();\nconsole.error(JSON.stringify({pid:process.pid}));\nsetInterval(() => {}, 1000);\n`,
    );
    await f.until(() => f.stderr().includes('\n'));
    const { pid } = JSON.parse(f.stderr());
    if (trigger === 'EOF') f.child.stdin.end();
    else f.child.kill(trigger);
    assert.equal((await f.done).code, 137);
    assertGone(pid);
  });
}

test('invalid overrides fail with diagnostics only on stderr', { timeout: 10000 }, async (t) => {
  for (const override of ['', 'relative', '/nonexistent/rustxng']) {
    const f = await fixture(t, undefined, override);
    assert.equal((await f.done).code, 1);
    assert.equal(f.stdout(), '');
    assert.match(f.stderr(), /absolute|unavailable/);
  }
});

test(
  'spawn failures are reported without unhandled errors or stdout',
  { timeout: 10000 },
  async (t) => {
    const f = await fixture(t, '#!/nonexistent/rustxng-interpreter\n');
    assert.equal((await f.done).code, 1);
    assert.equal(f.stdout(), '');
    assert.match(f.stderr(), /ENOENT/);
    assert.doesNotMatch(f.stderr(), /Unhandled/);
  },
);

test('closed child stdin does not crash the launcher on EPIPE', { timeout: 10000 }, async (t) => {
  const f = await fixture(
    t,
    `#!${process.execPath}\nrequire('node:fs').closeSync(0);\nconsole.error(JSON.stringify({pid:process.pid}));\nsetTimeout(() => process.exit(7), 100);\n`,
  );
  await f.until(() => f.stderr().includes('\n'));
  f.child.stdin.write('x'.repeat(1024 * 1024));
  assert.equal((await f.done).code, 7);
  assert.doesNotMatch(f.stderr(), /Unhandled/);
  assertGone(JSON.parse(f.stderr()).pid);
});

test(
  'launcher handles adjacent EOF and SIGTERM without leaving a child',
  { timeout: 10000 },
  async (t) => {
    for (const first of ['EOF', 'SIGTERM']) {
      const f = await fixture(
        t,
        `#!${process.execPath}\nprocess.on('SIGTERM', () => {});\nprocess.stdin.resume();\nconsole.error(JSON.stringify({pid:process.pid}));\nsetInterval(() => {}, 1000);\n`,
      );
      await f.until(() => f.stderr().includes('\n'));
      const { pid } = JSON.parse(f.stderr());
      if (first === 'EOF') {
        f.child.stdin.end();
        f.child.kill('SIGTERM');
      } else {
        f.child.kill('SIGTERM');
        f.child.stdin.end();
      }
      assert.deepEqual(await f.done, { code: 137, signal: null });
      assert.equal(f.stdout(), '');
      assert.deepEqual(JSON.parse(f.stderr()), { pid });
      assertGone(pid);
    }
  },
);

test('launcher propagates immediate child exit before any input', { timeout: 10000 }, async (t) => {
  const f = await fixture(
    t,
    `#!${process.execPath}\nconsole.error(JSON.stringify({pid:process.pid}));\nprocess.exit(19);\n`,
  );
  assert.deepEqual(await f.done, { code: 19, signal: null });
  assert.equal(f.stdout(), '');
  const { pid } = JSON.parse(f.stderr());
  assertGone(pid);
});
