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
  gates; fixed Explorer/Terminal/app jumps.
- **P2:** versioned local preferences for sound, volume, close-to-tray and
  Windows startup.

The webview cannot submit executable names, arguments, URLs or arbitrary
process targets. Rust resolves typed catalog IDs, validates workspaces and
rejects protected, stale or unobserved PIDs.

## Commands

```powershell
pnpm --filter @matriz/app-matriz-desktop dev
pnpm --filter @matriz/app-matriz-desktop test
pnpm --filter @matriz/app-matriz-desktop build:native
pnpm --filter @matriz/app-matriz-desktop package
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
  done through its observed listener row.
- Wallpaper is deliberately deferred. It should become a separate native
  capability only when a concrete product behavior exists.
- Updater signing/distribution is reserved for the first trusted release
  channel; the NSIS artifact is currently unsigned.
