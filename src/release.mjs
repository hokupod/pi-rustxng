import { homedir } from 'node:os';
import { join } from 'node:path';

export const VERSION = 'v0.31.1';
export const RELEASE_URL = `https://github.com/sahenjp/RustXNG/releases/download/${VERSION}`;

const artifact = (name, size, sha256) => Object.freeze({ name, size, sha256 });
export const TARGETS = Object.freeze({
  'darwin-arm64': artifact(
    'rustxng-v0.31.1-aarch64-apple-darwin',
    29099648,
    '3d8df7e68574adbcf18422075272016856392df6c606d65b22c6526dcbe74db5',
  ),
  'darwin-x64': artifact(
    'rustxng-v0.31.1-x86_64-apple-darwin',
    31132592,
    'cf12bc196955c5bdd90098f4b71c3119f1acd6477e4f00cbe73780449f9a5cba',
  ),
  'linux-x64': artifact(
    'rustxng-v0.31.1-x86_64-unknown-linux-musl',
    34259168,
    '18725ba33f1d36d85c4abd2661c21c3698f4775760592eba074283881505db97',
  ),
  'linux-arm64': artifact(
    'rustxng-v0.31.1-aarch64-unknown-linux-gnu',
    32731840,
    '4887547a1ff1ab50c25030c93165364fb2b9647cd1d24b978ab33b7abdf5f38c',
  ),
  'win32-x64': artifact(
    'rustxng-v0.31.1-x86_64-pc-windows-msvc.exe',
    31232512,
    'a509798f040722db4a3df9eebb3551437c69189ed0003bb2a0b62bf749cf6775',
  ),
});
export const LEGAL_FILES = Object.freeze([
  artifact('LICENSE', 34520, '57c8ff33c9c0cfc3ef00e650a1cc910d7ee479a8bc509f6c9209a7c2a11399d6'),
  artifact('NOTICE', 2890, '0740830f4a7b153429270002eee52506fbc1fefcd55e1aad27d76ef3262853b6'),
]);

export function selectArtifact(platform = process.platform, arch = process.arch) {
  const selected = TARGETS[`${platform}-${arch}`];
  if (!selected) throw new Error(`Unsupported RustXNG target: ${platform}-${arch}`);
  return selected;
}

export function installDirectory(home = homedir()) {
  return join(home, '.local', 'share', 'pi-rustxng', VERSION);
}

export function binaryName(platform = process.platform) {
  return platform === 'win32' ? 'rustxng.exe' : 'rustxng';
}
