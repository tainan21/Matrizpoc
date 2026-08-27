# Windows development

The repository contract is Node 22 and pnpm 9.12.0. A different pnpm major can
rewrite `pnpm-lock.yaml` and resolve a second React type tree, producing errors
in apps that were not changed.

## Diagnose

```powershell
node --version
Get-Command pnpm -All
pnpm --version
```

Expected versions:

- Node `22.x`
- pnpm `9.12.0`

If the global `pnpm` shim is missing or broken, use the pinned version without
changing repository files:

```powershell
npx --yes pnpm@9.12.0 --filter @matriz/app-matriz-workbench typecheck
npx --yes pnpm@9.12.0 --filter @matriz/app-matriz-workbench lint
npx --yes pnpm@9.12.0 --filter @matriz/app-matriz-workbench test
```

To repair the user-level command permanently:

```powershell
npm install --global pnpm@9.12.0
pnpm --version
```

Inspect the resulting `pnpm-lock.yaml` before committing any install. Its
`lockfileVersion` must remain `9.0`. Do not commit `.env`, `.next`, logs,
screenshots generated outside `output/`, or cache directories.

## Start the Workbench

```powershell
$env:WORKBENCH_LOCAL_TOKEN = "choose-a-long-local-secret"
npx --yes pnpm@9.12.0 --filter @matriz/app-matriz-workbench dev
```

The server binds only to `http://127.0.0.1:3005`.

## Native Workbench package

The package is independent of Matriz Control. Its Electron main process starts
the traced Next standalone server on `127.0.0.1:3005`, creates the local
HTTP-only session itself and opens only that loopback origin. `control-desktop`
remains accepted as a one-version runtime-mode alias and resolves to
`native-desktop`; `workbench-control-v1` remains unchanged.

The shell obtains a repository root from the validated Control environment when
available, otherwise from its machine-local Electron user-data binding, and only
then from a native directory picker. A selected directory must contain
`pnpm-workspace.yaml`, `apps/`, and `apps/matriz-workbench/package.json`. It is
never written to `.matriz` or Git.

```powershell
pnpm --filter @matriz/app-matriz-workbench desktop:compile
pnpm --filter @matriz/app-matriz-workbench desktop:prepare
$env:WORKBENCH_WINDOWS_SIGNING_CERTIFICATE = "C:\secure\matriz-workbench.pfx"
$env:WORKBENCH_STORE_MANIFEST_PRIVATE_KEY = Get-Content -Raw "C:\secure\store-ed25519-private.pem"
$env:WORKBENCH_RELEASE_BASE_URL = "https://releases.example.com/workbench/"
pnpm --filter @matriz/app-matriz-workbench desktop:release
```

The release command refuses to continue without the signing-certificate path
and the Ed25519 private key used to create `release-manifest.json.sig`. The
private key, generated manifest, signature, installer and updater metadata are
release artifacts and must not enter Git. Update check, download and install
remain three separate actions in the trusted native menu; renderer URLs cannot
trigger them.
It generates exactly `matriz-workbench-<version>-windows-x64-setup.exe` and a
deterministic `release-manifest.json` in `apps/matriz-workbench/release/`.
Never commit that output, a certificate, `.env*`, logs, `.next`, or `dist`.

## Start MCP directly

```powershell
npx --yes pnpm@9.12.0 --filter @matriz/app-matriz-workbench mcp
```

MCP uses STDIO. It does not open a network port and does not require the browser
token. Codex approval policy remains responsible for approving mutating tools.
