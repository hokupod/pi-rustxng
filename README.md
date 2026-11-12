# pi-rustxng

[日本語](README.ja.md)

Use [RustXNG](https://github.com/sahenjp/RustXNG) web search and page reading in [Pi](https://github.com/earendil-works/pi) and [Oh My Pi (OMP)](https://github.com/can1357/oh-my-pi). Each host uses its native MCP support. OMP's built-in `web_search` remains a separate tool.

## Install in Pi

You need Node.js 22 or later and a Pi version that provides `pi.registerMcpServer`.

1. Install the extension.

   ```sh
   pi install git:github.com/hokupod/pi-rustxng
   ```

2. Start Pi, or run `/reload` in an existing session.
3. Run `/rustxng-install` in Pi without arguments. This command downloads and verifies RustXNG v0.31.2, LICENSE, and NOTICE from the official GitHub release.
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

The binary is stored at `~/.local/share/pi-rustxng/v0.31.2/rustxng`. Windows uses `rustxng.exe` in the same `.local/share/pi-rustxng/v0.31.2` directory under your home directory.

## Install in OMP

OMP support starts with `pi-rustxng@0.2.0`. Version `0.1.1` does not include it. You need Node.js 22 or later and OMP 18.13.2.

1. Install version `0.2.2` from npm:

   ```sh
   omp plugin install pi-rustxng@0.2.2
   ```

   To use a local checkout instead, link its absolute path:

   ```sh
   omp plugin link /absolute/path/to/pi-rustxng
   ```

   You can also use `omp plugin install /absolute/path/to/pi-rustxng`. These commands do not provide a project-local installation in OMP 18.13.2.

2. Start or restart OMP to load the new extension.
3. Run `/rustxng-install` without arguments to download and verify the managed binary.
4. Restart OMP after installation, then check `rustxng` in `/mcp`. You can also try `/mcp reload`; restart if it does not restore the connection. Plugin installation and binary installation do not prove that MCP connected.
5. Ask OMP to search with RustXNG, then read a result in the same connection. The tools are `mcp__rustxng_search` and `mcp__rustxng_read_page`. With `tools.xdev`, OMP may expose them through tool discovery.

Loading the OMP extension or starting its MCP launcher does not install RustXNG. The extension provides the installer command; OMP owns the MCP connection through the package's `.mcp.json`. No manual MCP settings changes are required.

## Use an existing binary

Set `PI_RUSTXNG_BIN` before starting either host:

```sh
PI_RUSTXNG_BIN="/absolute/path with spaces/rustxng" pi
PI_RUSTXNG_BIN="/absolute/path with spaces/rustxng" omp
```

The extension accepts an absolute path to an executable file. It does not search `PATH`. It rejects relative paths, empty values, directories, and non-executable files. You manage the version and integrity of this binary. The extension does not verify its hash.

While `PI_RUSTXNG_BIN` is set, `/rustxng-install` does not install the managed binary. To use the managed binary again, unset the variable and restart the host.

## Update or remove

RustXNG is pinned to v0.31.2. There is no automatic update or `postinstall` script. Running `/rustxng-install` again verifies and reuses the existing binary, LICENSE, and NOTICE.

After updating the extension from an older RustXNG pin, restart the host, run `/rustxng-install`, then restart again and check `/mcp`. The new version uses its own directory; older versions are left untouched.

The installer does not overwrite an incomplete or modified installation. Exit Pi and OMP, move the version directory shown in the error aside, and run the installer again.

To remove the Pi extension, run:

```sh
pi remove git:github.com/hokupod/pi-rustxng
```

For a local installation, pass the path shown by `pi list` to `pi remove`. After exiting both hosts, remove `~/.local/share/pi-rustxng/v0.31.2` if you no longer need the binary.

## Development

Follow [the development setup](docs/development.en.md) to install locked tools and enable repository-local checks. Run `node scripts/check.mjs` before publishing.

The runtime has no package dependencies. After installing the development dependencies, tests run with `node --test` without network access. Live search and page reading require separate integration checks in Pi and OMP.

## Documentation and license

- [Behavior and limits](docs/reference.en.md) covers supported targets, processes, configuration, and data sent to external services.
- [License and distribution](docs/distribution.en.md) explains the AGPL-3.0-or-later license and why binaries are downloaded rather than bundled.

## Acknowledgements

Thanks to [sahenjp](https://github.com/sahenjp) for [RustXNG](https://github.com/sahenjp/RustXNG), which provides this extension's web search and page-reading tools.
