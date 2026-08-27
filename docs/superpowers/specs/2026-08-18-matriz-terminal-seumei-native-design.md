# Matriz Terminal and Seumei Native Design

## Status

Approved on 2026-08-18. The product owner delegated the remaining technical
decisions and explicitly approved an independent, locally functional Seumei
installer plus integration in Matriz Control.

## Goal

Evolve Matriz Control from a compact launcher into a continuously useful
developer cockpit with a real multi-session PowerShell terminal, and ship a
standalone Windows-native Seumei application without duplicating Seumei's
domain or turning either product into a packaged website.

## Investigated context

- `apps/matriz-desktop` already establishes the native boundary with Tauri 2,
  Rust, React/Vite, an allowlisted command catalog, tray lifecycle, safe
  listener termination, app readiness, local gates and MatrizLib feedback.
- App launches currently discard stdin/stdout/stderr, so a developer cannot
  observe startup, installation or failure.
- Seumei's domain, repositories, use cases, presenters and mock data are
  app-local TypeScript and do not depend on Next.js. Its current route shells,
  navigation and centralized mock authentication do depend on Next.
- `@matriz/platform-storage` already supplies browser-local namespaced storage.
  Seumei Desktop can persist its local-first V1 state without creating another
  storage package or Prisma schema.
- MatrizLib already exposes the components, themes, tokens and semantic sound
  API needed by both renderers.

## Alternatives considered

### 1. Native PTY plus an app-local Seumei desktop surface — selected

Matriz Control hosts PowerShell through Windows ConPTY from Rust and renders it
with xterm.js. Seumei gains a Tauri/Vite shell under `apps/seumei/desktop` that
consumes Seumei's existing app-local domain, use cases, repositories and
presenters. This keeps native authority out of the webview, preserves domain
ownership and produces two small independent installers.

### 2. Open Windows Terminal and wrap the existing Seumei URL

This has low implementation cost but fails the product goal: terminal state is
outside Control, logs cannot drive the Control UI, and Seumei remains dependent
on a running web server. It is retained only as an explicit external-terminal
escape hatch.

### 3. Bundle Node and a Next server as a native sidecar

This maximizes page reuse but introduces a second runtime, port allocation,
server lifecycle, larger installers and slower startup. It recreates the
"website packaged as desktop" failure the product explicitly rejects.

## Architecture

### Matriz Control terminal boundary

`TerminalManager` is app-local Rust state. It owns at most six sessions. Each
session receives a backend-generated UUID, a fixed shell executable selected
as `pwsh.exe` then `powershell.exe`, a validated workspace working directory,
and current-user privileges only. The renderer can create, write, resize,
interrupt and close a known session; it cannot select an executable, elevate a
process or call a generic hidden command endpoint.

The PTY transport uses ConPTY through a maintained Rust adapter. Output is sent
to the owning webview through a Tauri channel suited to streaming data rather
than JSON broadcast events. Each reader runs independently to avoid ConPTY pipe
deadlocks. Session metadata and a bounded recent-output tail remain in Rust so
the renderer can recover after hide/show or a UI remount. Sessions terminate
when explicitly closed or when Control exits; hiding the window never kills
them. No background daemon is introduced.

The terminal frontend uses `@xterm/xterm` plus only the fit addon. It owns ANSI
rendering, keyboard/IME accessibility and resizing, while React owns tabs,
status, layout and actions. The webview never parses output to decide whether a
privileged operation is authorized.

### Managed operations

An interactive terminal and a managed operation share the same visual surface
but not the same authority:

- `terminal.create()` creates an unrestricted user-visible PowerShell session.
  It is explicitly a console controlled by the signed-in Windows user.
- `operation.start(id)` accepts only catalog IDs such as `app.seumei.web`,
  `app.seumei.native.build` or `gate.typecheck`. Rust resolves the executable,
  arguments and working directory, then attaches that process to a labelled
  terminal session.

This preserves the existing allowlist for buttons and automation. Arbitrary
text execution exists only inside a terminal the user intentionally opened; no
other UI control can smuggle shell text into it.

App runtime states become `stopped`, `queued`, `starting`, `installing`,
`ready`, `stopping`, `failed` or `exited`. The backend emits state transitions;
the navigation rail and app rows retain a small colored state marker even when
the terminal is collapsed.

### Seumei Desktop

The native product remains inside `apps/seumei` because it is another delivery
surface for the same domain, not a ninth domain app. Its structure is:

```text
apps/seumei/
  desktop/
    index.html
    src/                 # native shell, navigation and composition
    src-tauri/           # Windows lifecycle and installer only
    vite.config.ts
    tsconfig.json
  src/
    domain/              # unchanged shared app-local domain
    application/         # unchanged use cases
    mock/                # existing repositories and seeds
    ui/presenters/       # existing view-model boundary
    ui/product/          # portable product views used by native first
```

The first native release contains Dashboard, Establishments, Owners and a
compact local Settings surface. It uses `createNamespacedStore` over
localStorage so the installer works without Hub, Node, pnpm, a port or a
database. A small local profile establishes the V1 desktop session. The UI
labels this state `LOCAL`; it does not pretend to be centralized SSO. When Hub
is reachable, a later compatibility adapter may exchange a real session, but
Hub availability never blocks startup.

Web pages keep their existing Next runtime and contracts. Portable product
views receive view models and callbacks; they do not import Next navigation or
raw domain entities. Web-specific and desktop-specific shells adapt navigation
around those views.

Seumei Desktop uses its own identifier, settings path, icons and NSIS product
name, while retaining the canonical Seumei manifest identity. It is not added
as a separate registry app.

### Control integration for Seumei

The Seumei row exposes a compact `WEB | NATIVO` mode selector:

- Web starts `pnpm --filter @matriz/app-seumei dev` in a managed terminal and
  becomes ready when port 3002 listens.
- Native starts the installed Seumei executable when present.
- If not installed, Control detects a workspace-built NSIS artifact and offers
  `INSTALAR`; otherwise it offers `GERAR`, which runs the allowlisted
  `package:desktop` script in a managed terminal.

No download button is shown until a real signed release URL exists. The backend
models `not-built`, `built`, `installed` and `running` so a future release
provider can add download without changing the UI contract. The independently
generated installer remains usable without Control.

## Product and UX

### Visual thesis

An instrument panel cut from smoked glass: dense black-violet surfaces, thin
technical rules, restrained light, and live status moving through the product
like an electrical signal.

### Content plan

Control keeps one workspace and six modes: Ports, Apps, Terminal, Actions,
Doctor and Settings. There is no dashboard or onboarding. The titlebar exposes
the aggregate live state. The rail always shows terminal activity through a
small state light and running-session count.

At 420–760 px, Terminal is either its dedicated view or a collapsible bottom
dock showing the active tab and last line. At widths above 1100 px, the dock
becomes a resizable right rail available beside Ports, Apps, Actions and Doctor.
The dedicated Terminal view remains available at every size. Layout selection
uses CSS container/media behavior and never duplicates terminal sessions.

Tabs show name, working context, state light and close action. A plus button
opens PowerShell in the workspace. Managed tabs use recognizable labels such
as `SEUMEI / WEB`, `SEUMEI / BUILD` and `TYPECHECK`. Output activity, busy,
success and failure are visible by color and icon even when collapsed.

### Interaction thesis

- Terminal reveal is a 120 ms size/opacity transition; output itself never
  animates.
- State changes pulse once, then settle into a static accessible color and
  label.
- Switching modes uses a short shared-indicator movement and preserves focus.
- Reduced-motion removes all spatial transitions without hiding state.

Sounds remain opt-in and semantic: `navigation` for mode/tab changes,
`success` or `error` only when a managed operation ends, and no sound per line
or command.

### Bonus: Matriz Command Deck

`Ctrl+K` opens a compact global command deck over the current surface. It
fuzzy-searches a fixed local index of apps, terminal sessions, observed ports,
gates and quick targets. Results include live state and a keyboard hint. Deck
actions call the same typed gateway methods as visible controls; it is not a
command shell and never accepts an arbitrary executable or command string.

Examples: `seu web`, `seu native`, `terminal`, `kill 3002`, `types`, `files`.
Destructive results require a second explicit confirmation inside the deck.
Recent successful actions are ranked locally without telemetry. This feature
is intentionally outside the requested terminal flow but makes the entire
Control accessible in two keystrokes.

## Security

- PowerShell runs non-elevated as the current user in the validated workspace.
- Maximum six sessions; output tail, IPC chunk size and retained history are
  bounded.
- Backend-issued IDs are required for write/resize/interrupt/close.
- Managed operations remain catalog-only with fixed executable and arguments.
- Native installer discovery canonicalizes paths and accepts only the expected
  filename under Seumei's target directory or the registered installed path.
- URLs and release downloads remain disabled until a trusted signed release
  channel exists.
- Terminal escape sequences are rendered by xterm.js; output is never inserted
  as HTML.
- Secrets, terminal history, process output and build artifacts are not logged,
  committed or included in telemetry.

## Performance

- No terminal session exists until requested.
- Reader threads block on PTY output; there is no terminal polling.
- React receives bounded chunks and only updates the owning xterm instance.
- App status keeps the existing five-second visible-window cadence, augmented
  by immediate backend transitions.
- Only the active terminal mounts a renderer; inactive sessions retain their
  Rust tail and xterm buffer without React list rerenders.
- Seumei Desktop has no embedded Node server and no background process.

## Packaging and development

Matriz Control keeps its existing commands and gains terminal dependencies.
Seumei adds:

```text
pnpm --filter @matriz/app-seumei dev:desktop
pnpm --filter @matriz/app-seumei build:desktop
pnpm --filter @matriz/app-seumei package:desktop
```

The Seumei NSIS installer is built for current-user Windows x64 and uses the
WebView2 bootstrapper policy already proven by Control. CI packages both native
products on Windows and uploads their independent artifacts. Neither artifact
is tracked by Git.

## Testing and acceptance

TDD is required for every new behavior. Rust tests cover session limits,
backend-generated IDs, known-session authorization, resize normalization,
interrupt/close lifecycle, bounded output, managed-operation allowlists and
Seumei installer state. Frontend tests cover tab lifecycle, persistent status,
responsive dock state, Seumei mode selection, command-deck ranking and
destructive confirmation.

Acceptance requires:

1. Real PowerShell commands execute interactively in at least two tabs.
2. Tabs survive view changes and Control hide/show.
3. Seumei Web starts in a visible managed terminal and reaches port 3002.
4. Seumei Native builds, installs, starts without Hub/Node, persists local
   state, closes and uninstalls cleanly.
5. Control can build/install/start the native Seumei through typed actions.
6. Compact, desktop and large-screen layouts have no document overflow and
   keep terminal state visible.
7. Keyboard focus, screen-reader labels, contrast and reduced-motion behavior
   are verified.
8. Control and Seumei installers remain current-user, unsigned only as an
   explicitly documented V1 limitation.
9. Scoped tests, Rust tests, Clippy, global build, typecheck, lint, smoke,
   Prisma validation and app-boundary checks all exit zero.

## Deliberate limits

- Terminal sessions do not survive a full Control process exit; that would
  require a daemon and is not justified.
- No SSH, remote terminals, split panes, plugins or terminal collaboration.
- No bundled Node runtime or Next server in Seumei Desktop.
- No installer download until a real signed release channel exists.
- No shared native package is extracted until Seumei proves which shell code
  has two stable consumers; initial duplication is limited to minimal Tauri
  bootstrap/configuration, never domain behavior.
- Wallpaper remains deferred.

