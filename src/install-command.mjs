import { installRustxng } from './install.mjs';
import { installDirectory, VERSION } from './release.mjs';

export function installCommand({
  env = process.env,
  home,
  platform = process.platform,
  install = installRustxng,
  onInstalled,
}) {
  let installing = false;
  return async (args, ctx) => {
    if (args.trim()) {
      ctx.ui.notify('Usage: /rustxng-install', 'warning');
      return;
    }
    if (env.PI_RUSTXNG_BIN !== undefined) {
      ctx.ui.notify(
        'PI_RUSTXNG_BIN is set. Fix that executable or unset the override before installing the managed binary.',
        'warning',
      );
      return;
    }
    if (installing) {
      ctx.ui.notify('RustXNG installation is already running.', 'info');
      return;
    }
    installing = true;
    try {
      ctx.ui.notify(`Downloading and verifying official RustXNG ${VERSION} from GitHub.`, 'info');
      const result = await install({ directory: installDirectory(home), platform });
      const message = await onInstalled(result);
      ctx.ui.notify(message, 'info');
    } catch (error) {
      ctx.ui.notify(`RustXNG setup failed: ${error.message}`, 'error');
    } finally {
      installing = false;
    }
  };
}
