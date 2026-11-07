import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, renameSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = '.artifacts/release';
const archive = `${output}/pi-rustxng.tgz`;
const manifestPath = `${output}/manifest.json`;
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: false });
  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stderr || result.error || result.status}`);
  return result.stdout;
}
export function validateTag(tag, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || tag !== `v${version}`) {
    throw new Error('Release tag must exactly match the stable package version');
  }
}
export function validatePackage(pkg) {
  if (pkg.name !== 'pi-rustxng' || pkg.license !== 'AGPL-3.0-or-later' || pkg.private)
    throw new Error('Unexpected package identity');
  if (pkg.repository?.url !== 'https://github.com/hokupod/pi-rustxng.git')
    throw new Error('Unexpected repository');
  if (!pkg.keywords?.includes('pi-package') || pkg.pi?.extensions?.join() !== './src/extension.mjs')
    throw new Error('Missing Pi discovery metadata');
  for (const name of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublishOnly']) {
    if (pkg.scripts?.[name]) throw new Error(`Unexpected lifecycle script: ${name}`);
  }
}
export function validateEntries(entries) {
  const allowed =
    /^(package\/(package\.json|LICENSE|README(?:\.ja)?\.md|src\/[a-z-]+\.mjs|scripts\/install-rustxng\.mjs|config\/settings\.toml|docs\/[a-z.]+\.md))$/;
  if (!entries.length || entries.some((entry) => !allowed.test(entry)))
    throw new Error('Unexpected package archive entry');
  for (const required of [
    'package/package.json',
    'package/LICENSE',
    'package/README.md',
    'package/README.ja.md',
    'package/src/extension.mjs',
    'package/src/install.mjs',
    'package/src/release.mjs',
    'package/scripts/install-rustxng.mjs',
    'package/config/settings.toml',
  ]) {
    if (!entries.includes(required)) throw new Error(`Missing archive entry: ${required}`);
  }
}
function digest() {
  return createHash('sha256').update(readFileSync(archive)).digest('hex');
}
function verify(pkg) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (
    manifest.sha256 !== digest() ||
    manifest.name !== pkg.name ||
    manifest.version !== pkg.version ||
    manifest.commit !== run('git', ['rev-parse', 'HEAD']).trim()
  )
    throw new Error('Release artifact identity mismatch');
  const entries = run('tar', ['-tzf', archive]).trim().split('\n');
  validateEntries(entries);
  const packed = JSON.parse(run('tar', ['-xOzf', archive, 'package/package.json']));
  validatePackage(packed);
  if (packed.version !== pkg.version) throw new Error('Packed version differs');
  console.log(`Verified ${pkg.name}@${pkg.version}`);
}
function main(mode) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  validatePackage(pkg);
  if (mode === 'tag') {
    validateTag(process.env.GITHUB_REF_NAME, pkg.version);
  } else if (mode === 'pack') {
    mkdirSync(output, { recursive: true });
    if (readdirSync(output).length)
      throw new Error('Release output must be empty; move the previous artifact aside');
    const result = JSON.parse(
      run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', output]),
    );
    if (result.length !== 1 || result[0].filename !== `${pkg.name}-${pkg.version}.tgz`)
      throw new Error('Unexpected npm pack output');
    renameSync(`${output}/${result[0].filename}`, archive);
    writeFileSync(
      manifestPath,
      `${JSON.stringify({ name: pkg.name, version: pkg.version, commit: run('git', ['rev-parse', 'HEAD']).trim(), sha256: digest() }, null, 2)}\n`,
    );
    verify(pkg);
  } else if (mode === 'verify') {
    verify(pkg);
  } else throw new Error('Usage: node scripts/release-package.mjs tag|pack|verify');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv[2]);
