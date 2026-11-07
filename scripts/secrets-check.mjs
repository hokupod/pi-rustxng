import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('../toolchain-policy.json', import.meta.url)));
const configured = spawnSync('git', ['config', '--local', '--get', 'piRustxng.gitleaks'], {
  encoding: 'utf8',
});
const executable = process.env.GITLEAKS_BIN || configured.stdout?.trim() || 'gitleaks';
const version = spawnSync(executable, ['version'], { encoding: 'utf8' });
if (version.status !== 0 || version.stdout.trim() !== policy.gitleaksVersion) {
  console.error(
    `Gitleaks ${policy.gitleaksVersion} is required. Set GITLEAKS_BIN or run hooks:install with its path.`,
  );
  process.exitCode = 1;
} else {
  const staged = process.argv.includes('--staged');
  const args = [
    'git',
    '--redact',
    '--no-banner',
    '--no-color',
    '--config',
    '.gitleaks.toml',
    ...(staged ? ['--staged'] : ['--log-opts=--all']),
    '.',
  ];
  const result = spawnSync(executable, args, { stdio: 'inherit', shell: false });
  process.exitCode = result.status ?? 1;
}
