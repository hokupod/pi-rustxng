import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, chmod, lstat, mkdir, mkdtemp, open, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  binaryName,
  installDirectory,
  LEGAL_FILES,
  RELEASE_URL,
  selectArtifact,
} from './release.mjs';

export function verifyBytes(bytes, artifact) {
  if (bytes.length !== artifact.size) throw new Error(`Size mismatch for ${artifact.name}`);
  if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) {
    throw new Error(`SHA-256 mismatch for ${artifact.name}`);
  }
}

export function verifySidecar(bytes, artifact) {
  const match = bytes
    .toString('utf8')
    .trim()
    .match(/^([a-f0-9]{64})\s+\*?([^\r\n]+)$/i);
  if (!match || match[1].toLowerCase() !== artifact.sha256 || match[2] !== artifact.name) {
    throw new Error(`Checksum sidecar mismatch for ${artifact.name}`);
  }
}

async function download(name, limit, write, fetchImpl) {
  const response = await fetchImpl(`${RELEASE_URL}/${name}`, {
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok || !response.body)
    throw new Error(`Download failed for ${name}: HTTP ${response.status}`);
  const declared = response.headers.get('content-length');
  if (declared && Number(declared) > limit) {
    await response.body.cancel();
    throw new Error(`Download too large for ${name}`);
  }
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error(`Download too large for ${name}`);
    await write(chunk);
  }
}

async function verifyFile(path, artifact) {
  const info = await lstat(path);
  if (!info.isFile() || info.size !== artifact.size)
    throw new Error(`Invalid installed file: ${artifact.name}`);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest('hex') !== artifact.sha256)
    throw new Error(`SHA-256 mismatch for ${artifact.name}`);
}

async function completeInstall(directory, artifact, platform, legalFiles) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error('Install directory must be a real directory');
  await verifyFile(join(directory, binaryName(platform)), artifact);
  for (const legal of legalFiles) await verifyFile(join(directory, legal.name), legal);
  await access(
    join(directory, binaryName(platform)),
    platform === 'win32' ? constants.F_OK : constants.X_OK,
  );
}

export async function installRustxng({
  directory = installDirectory(),
  platform = process.platform,
  arch = process.arch,
  fetchImpl = fetch,
} = {}) {
  return installRelease({
    directory,
    platform,
    artifact: selectArtifact(platform, arch),
    legalFiles: LEGAL_FILES,
    fetchImpl,
  });
}

export async function installRelease({ directory, platform, artifact, legalFiles, fetchImpl }) {
  const command = join(directory, binaryName(platform));
  try {
    await lstat(directory);
    try {
      await completeInstall(directory, artifact, platform, legalFiles);
      return { command, reused: true };
    } catch (error) {
      throw new Error(`Existing installation is invalid. Move it aside and retry: ${directory}`, {
        cause: error,
      });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(dirname(directory), { recursive: true });
  const staging = await mkdtemp(join(dirname(directory), '.rustxng-'));
  try {
    const chunks = [];
    await download(`${artifact.name}.sha256`, 1024, async (chunk) => chunks.push(chunk), fetchImpl);
    verifySidecar(Buffer.concat(chunks), artifact);
    for (const file of [artifact, ...legalFiles]) {
      const target = join(staging, file === artifact ? binaryName(platform) : file.name);
      const handle = await open(target, 'wx', 0o600);
      try {
        await download(
          file.name,
          file.size,
          async (chunk) => {
            let offset = 0;
            while (offset < chunk.length) {
              const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset);
              if (!bytesWritten) throw new Error(`Could not write ${file.name}`);
              offset += bytesWritten;
            }
          },
          fetchImpl,
        );
        await handle.sync();
      } finally {
        await handle.close();
      }
      await verifyFile(target, file);
    }
    if (platform !== 'win32') await chmod(join(staging, binaryName(platform)), 0o700);
    await completeInstall(staging, artifact, platform, legalFiles);
    try {
      await rename(staging, directory);
    } catch (error) {
      if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(error.code)) throw error;
      await completeInstall(directory, artifact, platform, legalFiles);
      return { command, reused: true };
    }
    return { command, reused: false };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
