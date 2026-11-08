import { installCommand } from './install-command.mjs';

export default function rustxng(omp, options = {}) {
  omp.registerCommand('rustxng-install', {
    description: 'Download and verify official RustXNG v0.30.0 for native MCP discovery',
    handler: installCommand({
      ...options,
      onInstalled: (result) =>
        `${result.reused ? 'Verified' : 'Installed'} RustXNG. Restart OMP or run /mcp reload, then check /mcp for connection status.`,
    }),
  });
}
