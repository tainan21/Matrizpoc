# Matriz Control Operating Layer — Design

## Product intent

Matriz Control becomes the local operating layer for the Matriz ecosystem. Its first screen explains what is happening now and what deserves attention; Git exposes the real development state; Store installs and manages trusted capabilities; installed capabilities can contribute audited UI and native behavior; Health proves that extension path in the Windows desktop.

The experience stays operational and understandable. Internal boundaries, permissions, lifecycle, and failure handling remain hidden until the user needs detail.

## Constraints and chosen boundaries

- Implementation stays app-local to `apps/matriz-control`, except for changes owned by the existing `apps/health` app and unavoidable versioned contract updates.
- No runtime download or import of executable extension code. Remote installers require the existing signed-manifest, SHA-256, HTTPS allowlist, Authenticode/publisher, and Windows installation checks.
- Extensions are trusted capability bundles known to the Control build. Installation activates declarative contributions and, where applicable, an independently installed Windows application.
- The renderer submits typed intent and stable identifiers. Repository paths, Git arguments, commands, installers, system APIs, permissions, and secrets are resolved outside the renderer.
- Git has full daily-use authority, including destructive actions, but destructive previews and explicit confirmation tokens prevent stale or ambiguous execution. Reflog-based recovery is exposed when Git can recover the state.
- Health remains read-only and owns system observation. Control owns installation, activation, navigation composition, native hosting, and Control-specific host metrics.
- UI consumes ViewModels. Modules communicate through their `public.ts` surfaces and are composed by the Control bootstrap.
- No shared package is introduced: there is no second consumer with a stable domain-free implementation.

## Internal architecture

New work uses app-local capability modules:

```text
apps/matriz-control/src/modules/
  activity/
  extensions/
  git/
  home/
```

Each module owns domain rules, application facade/use cases, adapters, presenters, and a narrow `public.ts`. Existing horizontal code migrates only when touched. `src/bootstrap/index.ts` becomes the composition root for these facades while retaining manifest registration.

### Activity

Activity is a bounded, sanitized local ledger of operational summaries. Entries contain an ID, timestamp, category, action, subject reference, outcome, and safe message. They never contain terminal output, environment values, credentials, raw installer URLs, file contents, or arbitrary command text. The initial adapter persists an atomic, size-limited JSON document in Electron user data; web-only mode uses memory. Git mutations, Store lifecycle changes, extension activation, Doctor actions, and important runtime changes publish entries.

### Extensions and navigation mutation

An extension definition declares:

- identity, version, compatibility range, description, and publisher;
- dependencies and required capability permissions;
- contributions to navigation groups/items, routes, Home widgets, actions, indicators, and Doctor providers;
- installation kind: built-in activation or trusted Windows package;
- lifecycle support: install, activate, deactivate, update, uninstall.

The registry combines the trusted catalog with persisted installation records. Only compatible, installed, active extensions contribute to the shell. Unknown IDs and undeclared contribution types are rejected. Deactivation removes contributions without deleting the installation; uninstall deactivates first and removes its receipt/state. Core routes remain static and cannot be replaced by an extension.

Health is the first built-in activation bundle. Activating it contributes a `System Health` navigation group with `Overview` and `Resources`, a Home system-health widget, and a Doctor observation provider. Both pages are hosted from Health's declared loopback runtime; no Health internals are imported.

### Store intelligence

Store presents a single catalog across built-in activations and Windows installers. The lifecycle model distinguishes unavailable, available, downloading, downloaded, verifying, installing, installed-inactive, active, update-available, incompatible, disabling, uninstalling, and failed states. Existing signed installer mechanics remain authoritative.

Before installation, the detail view explains:

- `Adds`: declared navigation, pages, widgets, actions, indicators, and providers;
- `Requires`: permissions, dependencies, platform, and minimum Control version;
- `Changes`: visible Control surfaces affected by activation.

Receipts record package ID/version, source kind, integrity evidence where applicable, granted permissions, installed/updated time, activation state, and last error. Permission grants are constrained to the definition; the renderer cannot invent permissions. Activation and removal are explicit, reversible operations.

### Git

Git belongs to Control as an operational domain and does not depend on Workbench internals. A repository registry starts with the validated Matriz workspace root and can later accept explicitly selected roots through native validation. Every root is canonicalized and confirmed by `git rev-parse --show-toplevel` before use.

The Git facade exposes typed queries and commands:

- overview/status with HEAD, current branch/detached state, upstream, ahead/behind, staged/unstaged/untracked/conflicted counts, remotes, and operation-in-progress state;
- local and remote branches with upstream, last commit, worktree occupancy, merge state, and divergence;
- commit graph/history and commit detail;
- working-tree and commit/branch diffs, including file and hunk metadata;
- stage/unstage by file and hunk, commit, amend, fetch, pull, push, set upstream, branch create/switch/rename/delete, compare, merge, abort/continue, and conflict resolution;
- destructive preview/execute for discard, clean, hard/mixed/soft reset, and forced branch deletion;
- reflog and recovery branch creation.

Adapters call the Git executable directly with argument arrays, bounded timeouts, output limits, disabled prompts, and an allowlisted environment. No command string or arbitrary argument list crosses the UI boundary. Machine-readable output uses stable delimiters and `-z` where paths are involved. Operations serialize per repository, refresh the snapshot afterward, and publish activity.

Mutations carry the repository snapshot revision they were prepared against. Destructive previews return a short-lived confirmation token bound to repository, operation, revision, and exact impact. Execution rejects expired or stale tokens. Pull defaults to fast-forward only; divergent histories require an explicit merge or rebase choice. Force push is never implicit and uses `--force-with-lease`.

Conflict handling exposes stages 1/2/3 and result text. Users may accept ours, theirs, both for text conflicts, or edit a result, then stage it. Binary conflicts expose only safe whole-side choices. Continue/abort commands are available for merge and rebase states detected by Git metadata.

### Home

`/home` becomes the primary route and first navigation item, before Apps. The Home facade collects independent provider snapshots with per-provider timeout and partial-failure reporting. Providers initially cover:

- selected workspace and recent projects;
- managed runtimes and previews;
- Git overview and branches requiring attention;
- Doctor alerts;
- installed/active extensions and recent Store changes;
- Health summary when active;
- recent activity and resolved quick actions.

The presenter ranks attention by severity and recency, then produces a stable layout: current context and next actions first; recent work and supporting state second; deeper Git workspace last. Home remains useful in empty state with workspace-open, Store, Doctor, and start-app actions. It is not an analytics dashboard.

## Desktop and security model

Electron is the authority for Git mutation, extension receipts, signed packages, privileged system metrics, and local persistence. The existing context-isolated preload exposes one frozen typed bridge. Commands are schema-validated in the main process, restricted to the Control main frame and loopback origin, and separated from the MCP agent surface. Store and destructive Git commands are human-interface-only.

The Health iframe receives only the explicitly versioned host snapshot messages it already supports. New extension contributions do not receive Node integration or generic IPC. Native permissions use stable capability IDs such as `system.metrics.read`, `git.repository.read`, and `git.repository.write`; granting one capability never implies another.

Web-only mode supports read-only server-side Git observation for the configured repository and memory-backed activation previews, but privileged installation, persistent receipts, destructive Git mutations, and native system metrics clearly report desktop-required states.

## UX direction

The supplied images establish the visual vocabulary: dark Control surfaces, violet as the primary action accent, dense operational typography, explicit state color, and Git graph visualization. They are references, not literal component specifications.

The implementation avoids an undifferentiated card mosaic. Home uses a strong current-context band, an attention/action workspace, and grouped operational sections. Git uses a primary workspace with tabbed modes and a contextual inspector: Overview, Changes, Commits, Branches, Compare, Merge, and Conflicts. Tables and split panes carry dense information; cards appear only where the card itself is an interactive object.

Keyboard focus, reduced motion, readable contrast, loading/empty/error states, narrow desktop layouts, and Portuguese utility copy are first-class acceptance requirements.

## Failure behavior

- Provider failure never blanks Home; the failed section reports stale/unavailable state and retry.
- Git refresh failure preserves the last successful snapshot marked stale. Mutations do not run without a fresh revision.
- Authentication prompts never hang a Git action; operations fail with actionable credential guidance.
- Store verification, compatibility, dependency, permission, installation, activation, and removal failures are distinct states with safe retry or rollback.
- Failed extension activation contributes nothing and preserves the previous valid registry.
- Unsupported temperature or hardware sensors remain explicitly unavailable, never zero.
- A process or port not owned by Control is observational only and cannot be terminated through extension actions.

## Delivery slices

1. Capability registry, receipts, activity ledger, and shell contribution composition.
2. Git domain/adapters/IPC plus Overview, Changes, Commits, and Branches.
3. Merge, conflicts, compare, destructive previews, reflog recovery, and agent-aware branch activity.
4. Home aggregation and operational Command Center UI.
5. Store lifecycle/intelligence UI and persistence migration from installed-apps v1.
6. Health activation with Overview/Resources navigation, Home widget, and Doctor integration.
7. Integrated UX pass, desktop packaging, installed-runtime validation, documentation, and governance updates.

Every slice leaves the current Apps, Terminal, Browser, Store, Doctor, updater, Workbench host, and Health behavior usable.

## Acceptance

- The app starts at `INÍCIO`, and Home renders real data with partial-failure handling.
- A user can complete the ordinary Git cycle and advanced branch/conflict/recovery flows without entering raw commands.
- Destructive Git operations show exact impact, require a current confirmation token, and create recoverable evidence when Git supports it.
- Store can install, activate, deactivate, update, and uninstall a trusted capability while explaining its effects and permissions.
- Installing and activating Health adds `System Health > Overview / Resources`; deactivation removes those contributions without corrupting the shell.
- Health exposes real CPU, RAM, storage, uptime, processes, and optional temperature while remaining read-only.
- Renderer requests cannot supply raw commands, repository paths, installer URLs, publishers, environment maps, or undeclared permissions.
- Scoped tests, lint, typecheck, builds, smoke tests, and boundary checks pass; Windows desktop validation exercises the real bridge and packaged runtime.

