# Set up development checks

The runtime has no package dependencies. Development uses Node.js 24 or later, Safe-chain 1.5.24, and Gitleaks 8.30.1. Tool versions and Safe-chain hashes are recorded in [toolchain-policy.json](../toolchain-policy.json).

## Prepare the tools

Install [Safe-chain 1.5.24](https://github.com/AikidoSec/safe-chain/releases/tag/1.5.24) at `~/.safe-chain/bin/safe-chain` and [Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) from their official distributions. Follow the upstream installation instructions and verify the release checksums. The repository does not install or update these tools automatically.

The Safe-chain wrapper verifies its pinned hash and version before executing it. It rejects an unsupported platform or a different binary instead of falling back to an unprotected package manager. Its supported development targets are macOS and Linux on arm64 or x64. This restriction does not change the RustXNG runtime targets.

From the repository root, install the locked development dependencies:

```sh
node scripts/safe-chain.mjs npm ci --ignore-scripts
```

Install the repository-local hooks, using the absolute path to your Gitleaks executable:

```sh
node scripts/install-hooks.mjs /absolute/path/to/gitleaks
```

The installer sets repository-local `core.hooksPath` and `piRustxng.gitleaks` values. It refuses to replace another configured hooks directory or existing non-sample hooks. In that case, integrate the checks with your existing hooks manually.

## Check changes before publishing

Format files, then run all checks:

```sh
node scripts/safe-chain.mjs npm run format
node scripts/check.mjs
```

The check command runs formatting, lint, unit tests, and a redacted Gitleaks scan of all local Git history. It stops at the first failure. Gitleaks is resolved from `GITLEAKS_BIN`, the repository-local `piRustxng.gitleaks` setting, or `PATH`, in that order. A missing or incorrect version fails the check.

The pre-commit hook scans staged changes, then runs formatting, lint, and unit tests. The pre-push hook runs the full check command. History scanning does not inspect uncommitted files, so stage and scan changes before committing them. Secret detection is not a guarantee that a repository contains no sensitive data. Review the diff and commit metadata before publishing.

Unit tests alone run without external connections:

```sh
node --test
```

Live search and page reading require a separate check through Pi. Unit tests do not establish that external search providers are available.
