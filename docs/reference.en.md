# Behavior and limits

## Supported targets

The installer selects an official RustXNG v0.30.0 standalone executable.

| Platform            | Official artifact target  |
| ------------------- | ------------------------- |
| macOS Apple Silicon | aarch64-apple-darwin      |
| macOS Intel         | x86_64-apple-darwin       |
| Linux x64           | x86_64-unknown-linux-musl |
| Linux arm64         | aarch64-unknown-linux-gnu |
| Windows x64         | x86_64-pc-windows-msvc    |

Linux arm64 requires glibc 2.39 or later. Linux x64 uses the musl build. The installer rejects other platform and CPU combinations. Inclusion in the manifest does not mean the extension has been tested on that platform.

## Processes and tools

The extension registers `rustxng` with Pi using these arguments:

```text
mcp --profile standard --config <package>/config/settings.toml
```

`<package>` is the extension's absolute installation path. `config/settings.toml` is empty. The explicit `--config` prevents an inherited `SEARXNG_SETTINGS_PATH` from selecting another configuration. The profile is fixed to `standard`; the extension has no option to select `full`.

Pi connects to registered servers when a session starts. The extension factory does not spawn a process itself. Registration after `/rustxng-install` starts Pi's connection handling. Startup is not deferred until the first search.

Pi manages process termination, connection state, reconnection, and tool exposure. The extension does not create an HTTP server, expose a LAN endpoint, or register an operating-system service. It has no custom MCP client or shell wrapper.

Tool exposure is `direct`, with a 60-second request timeout. Pi exposes `mcp__rustxng__search` and `mcp__rustxng__read_page`. RustXNG keeps the last 256 search-result URLs in a per-connection allowlist. `read_page` reads URLs from that list. Reconnection clears the list, so a new search is required before reading those pages again.

## Configuration precedence

A `rustxng` entry in a user or project `mcp.json` takes precedence over the extension registration. `/mcp` shows the actual connection and configuration. The extension's fixed command and profile do not apply to that overriding entry.

Shell commands such as `pi mcp list` do not load extensions. The session's `/mcp` command shows this extension's connection. File changes take effect after `/reload` or a restart.

If Pi's built-in MCP support is disabled or replaced by another extension, registration might not result in a connection.

## Data sent to external services

RustXNG sends search queries to the external providers in its `standard` profile. Page reading connects to the destination website. Search results and web pages are untrusted input. Instructions in a page are not user authorization. Queries must not contain passwords, API keys, or sensitive personal information.

The extension does not request or store credentials. RustXNG inherits Pi's environment as an ordinary child process. The extension does not sandbox that process.

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
