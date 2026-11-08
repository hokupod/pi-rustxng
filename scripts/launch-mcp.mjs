import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import { resolveBinary, launchSpec } from '../src/runtime.mjs';

try {
  const { command, args } = launchSpec(resolveBinary());
  const child = spawn(command, args, { shell: false, stdio: ['pipe', 'inherit', 'inherit'] });
  let timer;
  let stopping = false;
  let failed = false;
  const terminate = (signal = 'SIGTERM') => {
    child.kill(signal);
    timer = setTimeout(() => child.kill('SIGKILL'), 500);
  };
  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    process.stdin.unpipe(child.stdin);
    child.stdin.end();
    if (signal) terminate(signal);
    else timer = setTimeout(() => terminate(), 500);
  };
  const fail = (error) => {
    failed = true;
    console.error(`RustXNG MCP launcher: ${error.message}`);
    stop('SIGTERM');
  };
  child.on('error', fail);
  child.stdin.on('error', (error) => {
    if (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED') stop();
    else fail(error);
  });
  process.stdin.on('error', fail);
  process.stdin.on('end', () => stop());
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    process.stdin.destroy();
    process.exitCode = failed ? 1 : (code ?? 128 + (constants.signals[signal] ?? 0));
  });
  process.stdin.pipe(child.stdin);
} catch (error) {
  console.error(`RustXNG MCP launcher: ${error.message}`);
  process.exitCode = 1;
}
