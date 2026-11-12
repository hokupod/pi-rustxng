import { homedir } from 'node:os';
import { join } from 'node:path';

export const VERSION = 'v0.31.2';
export const RELEASE_URL = `https://github.com/sahenjp/RustXNG/releases/download/${VERSION}`;

const artifact = (name, size, sha256) => Object.freeze({ name, size, sha256 });
export const TARGETS = Object.freeze({
  'darwin-arm64': artifact(
    'rustxng-v0.31.2-aarch64-apple-darwin',
    29099616,
    '1f964f4e6f543248d8ef6629837c06a34fee0668a7838df1d01b6e0429a9bbb6',
  ),
  'darwin-x64': artifact(
    'rustxng-v0.31.2-x86_64-apple-darwin',
    31132904,
    '1a356815a8d005ac744258d47a357a4b49aba9a994d0b330e6b1b8e7fab0963e',
  ),
  'linux-x64': artifact(
    'rustxng-v0.31.2-x86_64-unknown-linux-musl',
    34266536,
    '70ac94e4cec1b598cffbf5a867f473d3c51f3d7070ab1b26142fed1ba827aa7a',
  ),
  'linux-arm64': artifact(
    'rustxng-v0.31.2-aarch64-unknown-linux-gnu',
    32726760,
    '62266611122a91132df96950ef2f3c21b979887e3190689620498c9d8f5f488c',
  ),
  'win32-x64': artifact(
    'rustxng-v0.31.2-x86_64-pc-windows-msvc.exe',
    31227392,
    'ba8c32ea7436c64368ed910aee7b3c5160822a3e2f98b1f7f4423ec6054becf6',
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
