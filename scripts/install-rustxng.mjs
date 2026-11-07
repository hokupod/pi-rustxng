import { installRustxng } from '../src/install.mjs';

if (process.argv.length > 2) {
  console.error('Usage: node scripts/install-rustxng.mjs');
  process.exitCode = 1;
} else {
  try {
    const { command, reused } = await installRustxng();
    console.log(`${reused ? 'Verified existing' : 'Installed'} RustXNG: ${command}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
