import { homedir } from 'node:os';
import { join } from 'node:path';

export const VERSION = 'v0.30.0';
export const RELEASE_URL = `https://github.com/sahenjp/RustXNG/releases/download/${VERSION}`;

const artifact = (name, size, sha256) => Object.freeze({ name, size, sha256 });
export const TARGETS = Object.freeze({
  'darwin-arm64': artifact('rustxng-v0.30.0-aarch64-apple-darwin', 28637808, '53ad48ba3c98fad64b57f9fcc66b984ea8cb5ff7363991b98dbcc7d86024aece'),
  'darwin-x64': artifact('rustxng-v0.30.0-x86_64-apple-darwin', 30558896, 'ac7b4e4ca66c6f980d64d4349bb4c1b72dad1f485f24f06536dae9a0a9526273'),
  'linux-x64': artifact('rustxng-v0.30.0-x86_64-unknown-linux-musl', 33647600, '718ca5e9f74340a016b32b6e3754bec0625f617cbd1b5f076297df1aa8762eb2'),
  'linux-arm64': artifact('rustxng-v0.30.0-aarch64-unknown-linux-gnu', 32194440, '50efe17dabb81f3c3b515c80902cc1e15091dd64bc2e00e9000b3a11d6460eed'),
  'win32-x64': artifact('rustxng-v0.30.0-x86_64-pc-windows-msvc.exe', 30659072, '75c392494bfe36002ed01dba8d56a365e98503cfe515786144368e6f0b45f9f8'),
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
