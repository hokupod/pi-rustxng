# Publish through GitHub Actions

[日本語](releasing.md)

The workflows are prepared, but this change does not publish a package or configure npm trust. Only a pushed `v*` tag starts `release.yml`. A branch push runs CI without publishing.

## Configure npm and GitHub

1. For a new package, publish the first reviewed version using your npm account and 2FA. The npm package settings must be available before following the trusted-publisher setup below. Do not use a placeholder package or reuse a version already published. See [npm's public-package guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/).
2. Create the GitHub environment `release`. Configure required reviewers if you want approval before each publish. The workflow's environment name alone does not add a reviewer or protection rule.
3. Open the npm package's **Settings → Trusted Publisher → GitHub Actions** and enter:
   - Organization or user: `hokupod`
   - Repository: `pi-rustxng`
   - Workflow filename: `release.yml`
   - Environment name: `release`
   - Allow direct `npm publish`. Dist-tag management is not needed.
4. Save the configuration using npm's required authentication. Do not create a long-lived npm token or add `NODE_AUTH_TOKEN` to GitHub.

These are account and permission changes for a maintainer to perform. The workflow does not make them. Current [npm trusted-publishing documentation](https://docs.npmjs.com/trusted-publishers/) says an unused trust configuration expires unless the first publish validates it within two days. Configure trust when you are ready to release. npm requires at least Node 22.14 and npm 11.5.1; this workflow uses Node 24.22.3 or a later Node.js 24 release and npm 11.21.2 on GitHub-hosted Ubuntu.

## Release a version

1. Update `package.json` and `package-lock.json` to the same new stable version, such as `0.1.1` after an initial `0.1.0` publish.
2. Review the diff and commit metadata, run `node scripts/check.mjs`, and push the reviewed commit. Wait for CI to pass.
3. Create and push the matching tag, such as `v0.1.1`, only when you intend to publish that version publicly.
4. Approve the `release` environment if reviewer protection is configured. Check the Actions result and npm version afterward.

The check job rejects a tag that differs from the stable package version. It runs the checks, packs the package without lifecycle scripts, checks the archive allowlist and package identity, and records its SHA-256 and commit. The publish job receives that artifact, verifies it again, and publishes the same tarball using OIDC. Only that job has `id-token: write`. npm generates provenance for supported trusted publishes from public repositories.

If a publish result is uncertain, check npm before retrying. npm does not allow publishing the same version again. Do not move an existing release tag to retry a different commit.

## Verify locally without publishing

```sh
node scripts/check.mjs
node scripts/release-package.mjs pack
node scripts/release-package.mjs verify
```

The output is `.artifacts/release/`. The pack command refuses a nonempty output directory; move an earlier result aside before packing again. This local verification does not test OIDC, environment approval, or npm publish permissions. The release workflow has no manual-dispatch publishing path.
