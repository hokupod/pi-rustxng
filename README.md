# pi-rustxng

[日本語](README.ja.md)

Use [RustXNG](https://github.com/sahenjp/RustXNG) web search and page reading in [Pi](https://github.com/earendil-works/pi). This extension registers a stdio server through Pi's native MCP support.

## Install

You need Node.js 22 or later and a Pi version that provides `pi.registerMcpServer`.

1. Install the extension.

   ```sh
   pi install git:github.com/hokupod/pi-rustxng
   ```

2. Start Pi, or run `/reload` in an existing session.
3. Run `/rustxng-install` in Pi without arguments. This command downloads and verifies RustXNG v0.30.0, LICENSE, and NOTICE from the official GitHub release.
4. Open `/mcp` and check the `rustxng` connection. A registration notification does not guarantee a successful connection.
5. Ask Pi to search with RustXNG and read a page from the results.

Loading the extension does not download anything. If RustXNG is missing, the extension loads and explains how to install it. After installation, it registers the MCP server.

To install from a local checkout, run:

```sh
git clone https://github.com/hokupod/pi-rustxng.git
cd pi-rustxng
node scripts/install-rustxng.mjs
pi install .
```

The binary is stored at `~/.local/share/pi-rustxng/v0.30.0/rustxng`. Windows uses `rustxng.exe` in the same `.local/share/pi-rustxng/v0.30.0` directory under your home directory.

## Use an existing binary

Set `PI_RUSTXNG_BIN` before starting Pi:

```sh
PI_RUSTXNG_BIN="/absolute/path with spaces/rustxng" pi
```

The extension accepts an absolute path to an executable file. It does not search `PATH`. It rejects relative paths, empty values, directories, and non-executable files. You manage the version and integrity of this binary. The extension does not verify its hash.

While `PI_RUSTXNG_BIN` is set, `/rustxng-install` does not install the managed binary. To use the managed binary again, unset the variable and restart Pi.

## Update or remove

RustXNG is pinned to v0.30.0. There is no automatic update or `postinstall` script. Running `/rustxng-install` again verifies and reuses the existing binary, LICENSE, and NOTICE.

The installer does not overwrite an incomplete or modified installation. Exit Pi, move the version directory shown in the error aside, and run the installer again.

To remove the extension, run:

```sh
pi remove git:github.com/hokupod/pi-rustxng
```

For a local installation, pass the path shown by `pi list` to `pi remove`. After exiting Pi, remove `~/.local/share/pi-rustxng/v0.30.0` if you no longer need the binary.

## Development

Follow [the development setup](docs/development.en.md) to install locked tools and enable repository-local checks. Run `node scripts/check.mjs` before publishing.

The runtime has no package dependencies. Unit tests run with `node --test` without network access. Live search and page reading require a separate Pi integration check.

## Documentation and license

- [Behavior and limits](docs/reference.en.md) covers supported targets, processes, configuration, and data sent to external services.
- [License and distribution](docs/distribution.en.md) explains the AGPL-3.0-or-later license and why binaries are downloaded rather than bundled.
