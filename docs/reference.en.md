# Behavior and limits

## Supported targets

The installer selects an official RustXNG v0.31.2 standalone executable.

| Platform            | Official artifact target  |
| ------------------- | ------------------------- |
| macOS Apple Silicon | aarch64-apple-darwin      |
| macOS Intel         | x86_64-apple-darwin       |
| Linux x64           | x86_64-unknown-linux-musl |
| Linux arm64         | aarch64-unknown-linux-gnu |
| Windows x64         | x86_64-pc-windows-msvc    |

Linux arm64 requires glibc 2.39 or later. Linux x64 uses the musl build. The installer rejects other platform and CPU combinations. Inclusion in the manifest does not mean the extension has been tested on that platform.

## Pi processes and tools

The extension registers `rustxng` with Pi using these arguments:

```text
mcp --profile standard --config <package>/config/settings.toml
```

`<package>` is the extension's absolute installation path. `config/settings.toml` is empty. The explicit `--config` prevents an inherited `SEARXNG_SETTINGS_PATH` from selecting another configuration. The profile is fixed to `standard`; the extension has no option to select `full`.

Pi connects to registered servers when a session starts. The extension factory does not spawn a process itself. Registration after `/rustxng-install` starts Pi's connection handling. Startup is not deferred until the first search.

Pi manages process termination, connection state, reconnection, and tool exposure. The extension does not create an HTTP server, expose a LAN endpoint, or register an operating-system service. It has no custom MCP client or shell wrapper.

Tool exposure is `direct`, with a 60-second request timeout. Pi exposes `mcp__rustxng__search` and `mcp__rustxng__read_page`. RustXNG keeps the last 256 search-result URLs in a per-connection allowlist. `read_page` reads URLs from that list. Reconnection clears the list, so a new search is required before reading those pages again.

## Pi configuration precedence

A `rustxng` entry in a user or project `mcp.json` takes precedence over the extension registration. `/mcp` shows the actual connection and configuration. The extension's fixed command and profile do not apply to that overriding entry.

Shell commands such as `pi mcp list` do not load extensions. The session's `/mcp` command shows this extension's connection. File changes take effect after `/reload` or a restart.

If Pi's built-in MCP support is disabled or replaced by another extension, registration might not result in a connection.

## OMP processes and tools

The package has separate `pi` and `omp` extension entries. OMP 18.13.2 selects the `omp` entry, `src/omp-extension.mjs`. This extension registers only `/rustxng-install`; it does not call Pi's `registerMcpServer` API.

OMP reads `.mcp.json` at the package root. The `rustxng` entry starts `node ${OMP_PLUGIN_ROOT}/scripts/launch-mcp.mjs` with `timeout` set to `60000` milliseconds. OMP expands `${OMP_PLUGIN_ROOT}` to the package installation path. Node.js 22 or later must be available as `node`.

The launcher resolves `PI_RUSTXNG_BIN` or the managed v0.31.2 binary using the same validation as Pi. It starts RustXNG with the fixed `standard` profile and bundled `config/settings.toml`. It forwards stdin and stdout, writes diagnostics only to stderr, and stops its child on stdin EOF or a handled termination signal. Forced termination of the launcher is not a guarantee of child cleanup.

OMP owns the connection, reconnection, and tool exposure. Its tools are `mcp__rustxng_search` and `mcp__rustxng_read_page`; `tools.xdev` may expose them through tool discovery. The built-in `web_search` is unchanged. Search and page reading require the same persistent connection. RustXNG's 256-URL allowlist is cleared on reconnection.

A missing or invalid binary makes the launcher exit with an installation or path error. Neither the launcher nor extension loading downloads a binary. Restarting OMP after `/rustxng-install` loads the installed binary. `/mcp reload` requests a runtime reload, but did not restore the plugin connection in the RPC check described below. A new extension requires an OMP restart. `/mcp` reports the actual connection; plugin registration or installer success alone does not establish it.

The package does not edit user or project settings. An existing server named `rustxng` can conflict with the plugin server, so the effective configuration in `/mcp` matters. The plugin's fixed profile applies only when OMP uses the bundled server definition.

## OMP release and verification limits

OMP support starts with pi-rustxng 0.2.0 and is absent from version 0.1.1. Installation commands and package loading were reviewed against [OMP 18.13.2 source](https://github.com/can1357/oh-my-pi/tree/e996e1c7ac476f60e02b8ed9764cf30fa8c00a8e). The runtime checks and their limits are recorded below.

## Data sent to external services

RustXNG sends search queries to the external providers in its `standard` profile. Page reading connects to the destination website. Search results and web pages are untrusted input. Instructions in a page are not user authorization. Queries must not contain passwords, API keys, or sensitive personal information.

The extension does not request or store credentials. RustXNG inherits its host's environment as an ordinary child process. The extension does not sandbox that process.

## Download verification

The installer downloads official release assets from fixed URLs and checks their pinned sizes and SHA-256 hashes. It also checks the binary's `.sha256` sidecar against the pinned hash and filename. LICENSE and NOTICE have pinned sizes and SHA-256 hashes.

Each download has a 180-second timeout and a size limit. All files are verified in a staging directory before that directory is renamed to the version directory. Failed installations are not published, and staging files are removed. If another installer finishes first, its installation is verified and reused.

SHA-256 verifies integrity. A checksum from the same GitHub release is not an independent signature or a separate authentication of the publisher. Executable permissions are applied only to files created by the installer. The installer does not use sudo, bypass Gatekeeper, or change system security settings.

## Verification record

On 2026-11-07, the initial implementation was tested on macOS Apple Silicon with Pi 1.4.0, Node.js 24.7.0, and RustXNG 0.30.0.

- All 15 initial unit tests passed, including installation failure, retry, existing-file protection, and argument rejection.
- A real search through Pi's native MCP returned three results. Reading one result returned 1,000 characters of page text.
- Reading an unsearched URL in a new Pi session was rejected.
- Repeating the installer command and RustXNG child-process termination after Pi exited were checked.

The integration check used a test provider with fixed tool calls, not an external LLM. It did not test whether a normal model selects the tools appropriately. Other operating systems and CPUs have not been tested on hardware.

### OMP support verification

On 2026-11-08, the packed artifact was tested on macOS Apple Silicon with Node.js 24.7.0, OMP 18.13.2, Pi 1.4.0, and RustXNG 0.30.0.

- The 22-file npm tarball was extracted and linked into OMP with an isolated home directory. OMP selected `src/omp-extension.mjs`.
- OMP print and interactive modes returned three search results and 1,000 characters from a result page. A separate connection rejected an unsearched URL.
- In interactive mode, `/mcp reload` completed, and `/mcp list` then showed the package's `.mcp.json` with `rustxng` connected.
- The offered tools included the built-in `web_search` and both RustXNG tools together.
- With no binary installed, the connection failed and RustXNG tools were absent. Startup did not download a binary.
- `/rustxng-install` in OMP RPC mode downloaded and verified the pinned release in the isolated home directory. Repeating the command reported `Verified`. After restarting OMP, search and page reading succeeded with the managed binary.
- Pi loaded its entry from the same packed artifact and returned three search results and 1,000 characters of page text.
- After the checked sessions exited, no tracked launcher or RustXNG child remained alive.

The OMP RPC check reported `No MCP servers configured` for `/mcp list`. `/mcp reload` did not expose the plugin tools in that session. Restarting into print mode succeeded; reload recovery in RPC mode is not verified.

These checks used a provider with fixed responses, not an external LLM. Normal model tool selection, other operating systems, and other CPUs remain untested. The process checks cover the observed exits, not every forced-termination scenario.

### RustXNG 0.31.1 verification

On 2026-11-10, the updated checkout was tested on macOS Apple Silicon with Node.js 24.7.0, Pi 1.4.0, OMP 18.13.2, and RustXNG 0.31.1.

- All five supported release binaries, their checksum sidecars, LICENSE, and NOTICE were downloaded from the official release. Their sizes and SHA-256 hashes matched GitHub's asset metadata and the release manifest. LICENSE and NOTICE were unchanged.
- Installation and offline reuse passed for all five artifact selections using those cached official downloads. Only the macOS Apple Silicon binary was executed; this does not establish runtime compatibility on the other targets.
- In isolated test homes, both Pi and OMP used the managed 0.31.1 binary. Each returned three search results and 1,000 characters from a result page through native MCP. A new connection rejected an unsearched URL. No tracked launcher or RustXNG child remained after the sessions exited.
- Formatting, lint, all 48 unit tests, the Git history secret scan, and a separate scan of the uncommitted diff passed.

The integration checks used fixed tool calls without an external LLM. Interactive reload, normal model tool selection, and other operating systems and CPUs were not retested for this update. The user's regular host settings and managed installation were not changed by these isolated checks.

### RustXNG 0.31.2 verification

On 2026-11-12, the updated checkout and packed artifact were tested on macOS Apple Silicon with Node.js 24.22.3, npm 11.21.2, Pi 1.4.0, OMP 18.13.2, and RustXNG 0.31.2.

- All five supported official binaries, checksum sidecars, LICENSE, and NOTICE were downloaded. Sizes and SHA-256 hashes matched GitHub asset metadata and the release manifest. LICENSE and NOTICE were unchanged.
- Installation and offline reuse passed for all five artifact selections using the verified downloads. Only the macOS Apple Silicon binary was executed.
- Both hosts used the managed 0.31.2 binary through native MCP from the checkout and packed artifact. Each returned three search results and read a result page (628 characters in Pi and 1,000 in OMP). New connections rejected unsearched URLs, and no tracked launcher or RustXNG child remained after exit.
- Formatting, lint, all 49 unit tests, the Git history secret scan, and separate scans of the uncommitted diff and extracted package passed. CI and release jobs now select Node.js 24.22.3 or a later Node.js 24 release.

Some upstream engines timed out, and an initial domain-filtered query returned no results. A broader public query completed search and page reading in both hosts. These checks do not guarantee every external engine's availability. They used fixed tool calls without an external LLM; interactive reload, normal model tool selection, and other operating systems and CPUs were not retested. Regular host settings and managed installations were unchanged.
