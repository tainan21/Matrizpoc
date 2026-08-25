# Matriz Control — Global Terminal Design

**Date:** 2026-08-24  
**Status:** Approved  
**Scope:** New `apps/matriz-control` application and the minimum monorepo registration required for it

## Purpose

Create a local operational cockpit for the Matriz ecosystem. Its first complete vertical slice is a global terminal that can start a known project, remain available while the user navigates, open from the bottom, dock to the right, and host multiple terminal tabs without replacing the dedicated Terminal page.

Matriz Control is a separate app. Matriz Workbench remains a local-first coworking product and continues to forbid generic shell execution.

## Product boundaries

- The Control owns process orchestration, terminal sessions, operational UI, and local preferences.
- Product apps expose only public metadata. The Control never imports another app's `src/**` or `app/**`.
- The initial implementation discovers apps through repository metadata and their `package.json` scripts.
- The implementation stays app-local until a second real consumer justifies a shared package.
- The browser never chooses an arbitrary filesystem path or starts an arbitrary command through a generic API.

## User experience

The Control shell contains Apps, Workspace, Terminal, Actions, Store, Doctor, and Settings destinations. The terminal dock belongs to the shell and therefore remains mounted while navigation changes.

The global dock:

- toggles with `Ctrl+J`;
- opens at the bottom by default;
- docks to the right on request;
- is resizable;
- supports multiple tabs;
- keeps sessions alive when hidden;
- focuses an existing app session when Start is invoked twice;
- separates hiding, closing a tab, and stopping a process;
- stores dock placement, size, and selected tab in browser storage;
- does not restore operating-system processes after a Control server restart in V1.

Each tab displays the project name, state, command, process identifier when available, exit code, and a bounded output buffer. The dedicated Terminal page exposes the same sessions with more space and explicit restart/stop controls.

## Architecture

### Control shell

A Next.js application on port `3008`. The root workspace layout mounts navigation, content, and `TerminalDockProvider`. The provider owns client presentation state and subscribes to server session events.

### Project catalog

An app-local integration adapter reads only known workspace locations and validates project metadata. The catalog derives a conservative allowlist from supported scripts such as `dev`, `lint`, `typecheck`, and `test`. Starting an app uses a server-selected command and server-selected working directory; request input contains only the project identifier and action identifier.

### Process supervisor

An app-local singleton owns terminal session state. It validates every project/action pair, enforces a session limit, starts a process in the known project directory, captures stdout/stderr, records lifecycle events, and stops the process tree explicitly.

The first implementation may use piped child processes instead of a native PTY when native terminal dependencies would make the slice fragile. The application-facing `TerminalRuntime` interface remains PTY-shaped so a native adapter can replace it without changing UI or routes. Interactive input is enabled only when the selected runtime supports it; otherwise the UI clearly labels the session as output-only. Native PTY support is the preferred target when it installs and validates cleanly on Windows.

### Transport

Authenticated same-origin endpoints create, list, inspect, restart, and stop sessions. A streaming endpoint sends ordered output and lifecycle events. The client reconnects and requests the current bounded buffer after interruption.

### Persistence

Process/session state is memory-only in V1. Browser preferences use local storage. No command output, environment content, token, or secret is committed or written to `.matriz/**`.

## Security

- Bind locally and reject non-local or unexpected origins.
- Authenticate Control routes with a local token exchanged for an HTTP-only, `SameSite=Strict` cookie.
- Validate identifiers, script names, resolved paths, message sizes, and session counts.
- Resolve working directories server-side and verify they remain within the repository or an explicitly registered local project.
- Do not accept raw command lines, raw environment maps, or arbitrary `cwd` values from the browser.
- Redact known secret-shaped output before it enters the client buffer.
- Use bounded circular buffers and bounded event payloads.
- Stop process trees deliberately and expose confirmation before destructive actions.

## States and failures

Sessions use `starting`, `running`, `stopping`, `exited`, and `failed` states. The UI distinguishes unavailable scripts, occupied ports, process exit, transport reconnection, authorization failure, and supervisor restart. A failed or exited tab remains inspectable and offers Restart.

If a second Start targets the same project and action while it is active, the existing tab is focused. If a port conflict is detectable, the new session fails with a useful message rather than spawning repeated retries.

## Accessibility

- All terminal and dock actions have visible labels or accessible names.
- Dock movement and resize have keyboard alternatives.
- Focus returns to the invoking control when the dock closes.
- Session state is conveyed by text in addition to color.
- Lifecycle messages use a polite live region; terminal output itself does not flood announcements.
- Motion respects `prefers-reduced-motion`.

## Verification

App-local unit tests cover catalog validation, path containment, session transitions, duplicate-start behavior, buffer limits, and preference parsing. Component tests cover keyboard toggle, tabs, docking, resize controls, and stop confirmation. Route tests cover invalid identifiers and forbidden commands.

Scoped validation:

- `pnpm --filter @matriz/app-matriz-control test`
- `pnpm --filter @matriz/app-matriz-control lint`
- `pnpm --filter @matriz/app-matriz-control typecheck`
- `pnpm --filter @matriz/app-matriz-control build`

Because registration touches manifests, shared configuration, and registry expectations, also run `pnpm test:smoke` and the repository boundary checks that cover cross-app imports.

## Incremental delivery

1. Register and scaffold Matriz Control with the existing design system.
2. Implement the validated project catalog and process runtime interface.
3. Implement session lifecycle and bounded output.
4. Add authenticated session routes and streaming.
5. Build the persistent bottom terminal dock and tabs.
6. Add right docking, resize, shortcuts, and preferences.
7. Connect Start actions and the full Terminal page.
8. Verify failure states, accessibility, architectural boundaries, and smoke tests.

## Explicitly deferred

- Split panes inside the terminal.
- Floating windows and arbitrary dock layouts.
- Restoring OS processes after server restart.
- Remote terminals or multiuser sessions.
- Generic filesystem browsing.
- Arbitrary command execution APIs.
- Extracting the supervisor into a shared package.
