# Matriz Control Operational Runtime — Design

## Outcome

Evolve Matriz Control from a catalog launcher into a coherent local operational
runtime. This round connects app execution, endpoints, routes, contextual
actions, preview and activity without creating a generic browser, IDE, shell
API or ecosystem-wide package.

## Scope

This design changes only `apps/matriz-desktop` and its app-local documentation.
It does not change root tooling, shared packages, other apps or their internals.
Matriz app definitions remain an app-local operational catalog because there is
only one native consumer and Rust must retain authority over executable and URL
resolution.

The round delivers:

1. a runtime snapshot that distinguishes durable app definition, managed
   execution, observed endpoint and external listener ownership;
2. one contextual action registry consumed by app cards, Quick Actions and the
   existing Command Deck;
3. allowlisted external open, declared routes, validated manual routes, URL
   copy, restart, stop and terminal focus;
4. one native WebView2 preview surface with back, forward, reload, route,
   loading, error and external-open controls;
5. a bounded in-memory activity feed that produces a compact operational
   presence from runtime, terminal, preview and action events.

The round deliberately defers Codex execution, inter-app IPC, bootstrap,
filesystem browsing, `.env` editing, Store, overlays and Rooms 3D. Their correct
integration points are documented below.

## Operational model

`ProjectDefinition` is durable configuration: identity, package, workspace,
port, declared routes and capabilities. `RuntimeInstance` is ephemeral: managed
operation/session, PID, lifecycle state, endpoint, health and ownership.

The frontend receives a serializable `RuntimeSnapshot` and presents a
`RuntimeViewModel`. UI never infers ownership from a port plus local terminal
state. Rust determines whether the endpoint is stopped, starting, managed,
ready, degraded or external.

An endpoint is constructed only from an allowlisted app definition. A route is
either a declared route ID or a manually entered local path. Manual paths must:

- start with `/`;
- contain no scheme, host, credentials, backslash, control character or `..`
  segment;
- remain below 2,048 characters;
- be resolved by Rust against the app's loopback origin.

The renderer never submits an arbitrary URL, executable or argument vector.

## Action registry

The application layer owns action metadata, contextual predicates and
presentation. Each `ContextualAction` has a stable ID, label, group, risk,
supported target kind and an executor that calls a semantic `DesktopGateway`
method. Surfaces ask the registry for applicable actions; they do not implement
their own spawn, clipboard, preview or lifecycle handlers.

Initial IDs:

- `runtime.open.external`
- `runtime.preview.open`
- `runtime.route.open`
- `runtime.url.copy`
- `runtime.restart`
- `runtime.stop`
- `runtime.terminal.focus`
- `terminal.clear`

Rust remains the authorization boundary. It resolves the app and route, checks
runtime ownership for destructive operations, and performs native URL or
preview work. Copying uses the browser clipboard only for a URL already returned
by the native runtime snapshot; no generic clipboard command is added.

The existing Command Deck becomes another registry surface. Destructive
confirmation stays in the deck and app cards use explicit labels and disabled
states.

## Native preview

Tauri already uses WebView2. The preview uses a Tauri child `Webview` hosted by
the main native window instead of an iframe or browser reimplementation. The
native layer creates it from an allowlisted runtime target, restricts every
navigation to the selected app's loopback origin, blocks new-window requests,
and emits navigation/loading state to the renderer.

Only one preview webview exists:

- opening replaces any previous preview;
- hiding another Control view closes and disposes it;
- closing the preview disposes it;
- hiding/minimizing the Control hides the preview;
- reopening recreates it at the last Control-owned route.

This is intentionally stricter than an inactive/suspend cache. One live child
webview provides deterministic memory and avoids keeping nine renderers. A later
measured optimization may retain one hidden preview and call WebView2 suspend,
but it is not required for this round.

The React layout reports a bounded preview rectangle to Rust. Rust owns child
webview creation, bounds, navigation, reload, back, forward and disposal. Tauri
commands that create or manipulate the child webview are asynchronous to avoid
the documented Windows synchronous-command deadlock.

## Activity backbone and operational presence

An app-local `ActivityHub` stores at most 200 structured events in memory and
fans them out through one Tauri channel. Events use a stable envelope with ID,
kind, severity, source, timestamp, optional app/runtime/session target and a
small payload.

Initial kinds:

- `runtime.started`, `runtime.ready`, `runtime.stopped`, `runtime.failed`
- `terminal.command.completed`, `terminal.command.failed`
- `preview.opened`, `preview.navigation.failed`, `preview.closed`
- `action.completed`, `action.failed`

The UI derives a compact `OperationalPresence`: the newest important event,
online/busy/error state and up to five recent entries. It is a status rail, not
a chat. It contains no prompt box, transcript or generated advice. Contextual
actions may be attached only when they already exist in the action registry.

History is ephemeral in this round. Persistence waits until retention,
sensitivity and redaction rules exist. Terminal output is never copied into the
activity payload; only status and bounded summaries are emitted.

## Data flow

1. Rust creates or observes a managed runtime and returns `RuntimeSnapshot`.
2. React presents `RuntimeViewModel` and asks the registry for applicable
   actions.
3. A card, Quick Actions or Command Deck invokes the same action ID and target.
4. The action executor calls a typed gateway method.
5. Rust validates the catalog target and performs the privileged operation.
6. Rust publishes an activity event and returns the updated snapshot.
7. Apps, terminal, preview and presence update from the same structured state.

## Error and security behavior

- External listeners remain visible but cannot be stopped or restarted by app
  actions.
- Stale ownership fails closed and asks for refresh.
- Preview rejects non-loopback origins, scheme changes, downloads and popups.
- A stopped runtime cannot open preview; an external ready endpoint may be
  opened or previewed but remains protected from lifecycle actions.
- Route validation failures are user-visible and produce no native side effect.
- Activity payloads exclude terminal contents, environment values, tokens,
  cookies and arbitrary filesystem paths.
- The visible ConPTY remains the only arbitrary-input execution surface.

## Testing and acceptance

Rust tests cover route validation and URL construction, action target
authorization, runtime ownership mapping, preview navigation allowlisting,
single-preview lifecycle and bounded activity history.

Frontend tests cover registry applicability, shared use by cards/Quick Actions/
Command Deck, route input, preview state controls and operational presence.
Existing process, terminal, settings and command-contract tests remain green.

Visual verification covers Apps with Quick Actions, integrated Preview and
compact operational presence at 760x700 and 1440x900. The packaged Windows
acceptance suite is updated only for new stable selectors and behavior; build
artifacts and temporary screenshots remain ignored.

The existing ConPTY test `a_real_shell_streams_written_output_into_its_bounded_tail`
is a pre-existing reproducible baseline failure and must be diagnosed separately
before a final all-green claim. No timeout increase is accepted without proving
the root cause.

## Expansion points

### Codex

Use the supported Codex App Server over a Control-owned allowlisted `stdio`
child process. Generate version-matched schemas and translate only thread, turn,
item, command and file-change events into `ActivityHub`. Do not scrape Codex app
files. The WebSocket transport is experimental and is not selected.

### Inter-app protocol

If a web and native app both need to publish to Control, prefer a loopback
WebSocket service with origin checks, a per-install capability token, a versioned
envelope and bounded ingress. Named pipes remain preferable for native-only
clients but do not serve browser apps. This requires a separate threat model and
POC.

### Developer bootstrap

Model Clone, Install, Doctor, Run and Repair as allowlisted managed operations
that emit the same activity events. Do not add a generic setup script executor.

### MatrizLib

Control already consumes the canonical public design packages and semantic
sound runtime. The next integration is a declared MatrizLib route collection and
component-context actions, not copying portal internals or merely embedding the
home page.

### Rooms 3D

Rooms should consume read-only runtime snapshots and activity events through a
future versioned external protocol. It gets no separate process or agent model.

## Rejected for this round

- generic browser features, arbitrary URLs, downloads and profiles;
- generic shell/process/filesystem commands;
- iframe preview;
- nine cached preview renderers;
- route crawling as a source of truth;
- persistent activity before retention/redaction rules;
- agent chat;
- shared package extraction;
- `.env` editor, file explorer, Store, window overlays and Rooms 3D.
