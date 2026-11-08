import { accessSync, constants, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { binaryName, installDirectory } from './release.mjs';

const configPath = fileURLToPath(new URL('../config/settings.toml', import.meta.url));

export function resolveBinary(env = process.env, home, platform = process.platform) {
  const override = env.PI_RUSTXNG_BIN;
  const command =
    override === undefined ? join(installDirectory(home), binaryName(platform)) : override;
  if (!isAbsolute(command)) throw new Error('PI_RUSTXNG_BIN must be an absolute executable path.');
  try {
    if (!statSync(command).isFile()) throw new Error('Not a file');
    accessSync(command, platform === 'win32' ? constants.F_OK : constants.X_OK);
  } catch (error) {
    throw new Error(
      `RustXNG executable is unavailable: ${command}. Run /rustxng-install or fix PI_RUSTXNG_BIN.`,
      { cause: error },
    );
  }
  return command;
}

export function launchSpec(command) {
  return { command, args: ['mcp', '--profile', 'standard', '--config', configPath] };
}
