# Matriz Control desktop updater — design

## Outcome

The existing header refresh affordance becomes a small, explicit update center for the packaged Windows desktop. It checks a release channel, shows the target version and release notes, downloads only after a human click, exposes progress, and installs only after a second explicit click that restarts Control.

## Architectural scope

- All product code remains inside `apps/matriz-control`.
- The renderer speaks only through the existing typed desktop bridge.
- Electron owns release discovery, download, signature verification, and restart/install.
- No updater command is exposed to the MCP/agent command server.
- Browser-only development remains functional and reports that desktop updates require the installed app.

## Safety and release model

- Use the official `electron-updater` NSIS flow. Differential download remains enabled (its default), so blockmaps can transfer only changed package blocks when the release host supports them.
- Keep `autoDownload = false` and `autoInstallOnAppQuit = false`.
- Never accept a URL, path, version, or artifact from renderer input. The release provider is packaged by the trusted build pipeline in `app-update.yml`.
- Keep the Windows Authenticode verification default enabled. Production publishing is not considered ready until the build pipeline supplies a signed installer and trusted publisher configuration.
- A missing packaged release channel is a first-class `unavailable` state, not a crash and not a fake successful check.
- Installing/restarting requires a dedicated human action. Checking and downloading never restart the app.

## Contract

Desktop commands:

- `update.status`
- `update.check`
- `update.download`
- `update.install`

The desktop result is a renderer-safe snapshot with current/available version, state (`unavailable`, `idle`, `checking`, `available`, `downloading`, `downloaded`, `current`, `error`), progress, notes, and a short user-facing message. Updater events push the same snapshot so progress updates without polling.

## UI

The header button opens a compact dialog. It leads with current state, then exposes only the next valid action:

- check for updates;
- download the known update;
- restart and install after download.

Closing the dialog does not cancel an in-flight download. Errors stay recoverable through a new check. The existing light shell and the Health-mutated shell share the same update surface.

## Testing

- Domain tests reject updater commands with payloads and unknown commands.
- An updater coordinator is tested with a fake adapter, including unavailable development mode, manual download, progress, and explicit install.
- UI presenter/component tests cover each action state without network or Electron.
- Final validation runs Control tests, lint, typecheck, build, desktop compile, repository smoke tests, boundary verification, and the browser Health journey.
