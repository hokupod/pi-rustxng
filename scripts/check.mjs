import { spawnSync } from 'node:child_process';
const steps = [
  ['scripts/safe-chain.mjs', 'npm', 'run', 'format:check'],
  ['scripts/safe-chain.mjs', 'npm', 'run', 'lint'],
  ['--test'],
  ['scripts/secrets-check.mjs'],
];
for (const args of steps) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
