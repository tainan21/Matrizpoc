# Matriz Control

First native application of the Matriz ecosystem. Tauri 2 hosts a compact
React/MatrizLib renderer while Rust owns the Windows authority.

## Ownership (L9)

- **Responsibility:** Windows-native developer utility for safe local Matriz
  process, port and workspace operations.
- **Exposes:** `public-contract.ts` with the app manifest only.
- **Does not expose:** Win32 primitives, command execution, filesystem access or
  desktop UI internals.
- **May import:** public domain-free `@matriz/*` contracts and design packages.
- **Must not import:** another app's `src/**` or `app/**`.

The desktop runtime is app-local. No shared package is justified until a second
native consumer exists.

## Release 0.1

- **P0:** listener/PID inventory with snapshot-authorized kill and kill-all;
  allowlisted app launcher; ports 3000–3007 readiness.
- **P1:** tray and `Ctrl+Shift+M`; Git pulse; local doctor; four repository
  gates; fixed Explorer/Terminal/app jumps; six bounded PowerShell tabs with
  observable app and gate output.
- **P2:** versioned local preferences for sound, volume, close-to-tray and
  Windows startup; Web/Native lifecycle for standalone Matriz Admin and a
  separate Seumei Web lifecycle on port 3008.

`Ctrl+K` opens the Matriz Command Deck. It ranks apps, gates, targets, sessions
and currently observed PIDs; destructive actions require a second explicit
confirmation. This is the only UI shortcut layer and never accepts executable
paths or generated arguments.

Apps now consumes one operational runtime snapshot: status, ownership, PID,
managed terminal session, loopback endpoint and health. A contextual Action
Registry supplies the compact actions used by the runtime surface. Routes come
only from each app's `public-contract.ts` manifest, with a manually typed local
path revalidated by Rust before navigation.

Preview is a single native child WebView2, not a generic browser. It accepts only
the selected app's `http://localhost:<catalog-port>` origin, rejects popups and
downloads, follows its host rectangle, and is closed when the surface unmounts.
Terminal lifecycle, runtime actions and preview openings publish short activity
envelopes into an in-memory history capped at 200 entries. Agent Presence shows
the latest five entries and deliberately has no prompt box.

The webview cannot submit executable names, arguments, URLs or arbitrary
process targets for automation. Rust resolves typed catalog IDs, validates
workspaces and rejects protected, stale or unobserved PIDs. The visible terminal
is deliberately different: it is an explicit user console backed by ConPTY,
limited to six sessions and bounded input/output buffers.

Workspace now includes a native `.env` manager and bounded project Explorer.
Secrets stay masked until an explicit reveal, while saves use revision checks
and atomic replacement. Compare and Promote copy selected values inside Rust,
never through the renderer. Impact Radar scans at most 2,000 small source files,
ignores generated/vendor directories and returns file/line references without
source values.

Runtime Recovery restarts only managed processes and preserves external
listeners. Operational Runbooks are a fixed native catalog: the renderer can
choose a runbook and app, but cannot provide steps, programs or URLs.

Store and Wallet remain an atomic native ledger. Installation requires consent
to the exact bundled permission set and creates a SHA-256 receipt from canonical
catalog metadata. Trust Center reports verified, changed or missing receipts;
Repair only restores owned, installed packages from the bundled catalog.

## Commands

```powershell
pnpm --filter @matriz/app-matriz-desktop dev
pnpm --filter @matriz/app-matriz-desktop test
pnpm --filter @matriz/app-matriz-desktop build:native
pnpm --filter @matriz/app-matriz-desktop package
pnpm --filter @matriz/app-matriz-desktop acceptance:installed
```

The installer is written to
`src-tauri/target/release/bundle/nsis/Matriz Control_<version>_x64-setup.exe`.
It installs for the current user and WebView2 is obtained through Microsoft's
bootstrapper only when the runtime is absent.

## Adding a feature

1. Add a typed application-facing method to `src/application/desktop-gateway.ts`.
2. Add the exact Rust command and validate a catalog ID or structured input.
3. Test authorization in Rust before wiring the React interaction.
4. Keep domain-free visual and sound usage on public MatrizLib exports.

## Limits

- Windows x64 is the only packaged target in 0.1.
- Node, pnpm and Git remain host prerequisites for repository operations.
- Apps started by Control are tracked locally; stopping an inherited process is
  forbidden. An occupied catalog port is marked `EXTERNO` and remains protected;
  use the Ports view only when an explicit, snapshot-authorized kill is intended.
- Wallpaper is deliberately deferred. It should become a separate native
  capability only when a concrete product behavior exists.
- Codex is not scraped. A future bridge must use the supported Codex app-server
  JSONL protocol over stdio and translate only structured task/turn/item events.
- Inter-app sockets, remote package distribution, multi-window overlays and
  Rooms 3D remain deferred. A future web-app bridge should use authenticated
  loopback transport; native-only peers may justify named pipes.
- Updater signing/distribution is reserved for the first trusted release
  channel; the NSIS artifact is currently unsigned.
- Matriz Admin can be generated, installed and opened from Apps → `NATIVO`. A future
  Matriz Hub download must consume the signed CI release artifact; build output
  is never copied into the web app or committed as public content.

## Acceptance

The Windows release gate installs the NSIS candidate, drives the real WebView2,
exercises the nine product capabilities, records the visual matrix and idle
performance, exits through the product command, and uninstalls. Two consecutive
runs must pass against the same SHA-256. See [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)
and the canonical audit in `docs/audit/2026-08-20-matriz-control-acceptance.md`.
