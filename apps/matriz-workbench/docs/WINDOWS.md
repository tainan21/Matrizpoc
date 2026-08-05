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

## Start MCP directly

```powershell
npx --yes pnpm@9.12.0 --filter @matriz/app-matriz-workbench mcp
```

MCP uses STDIO. It does not open a network port and does not require the browser
token. Codex approval policy remains responsible for approving mutating tools.
