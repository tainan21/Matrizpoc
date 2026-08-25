# Workbench Local Control Runtime Design

**Date:** 2026-08-25  
**Status:** Approved in chat  
**Scope:** `apps/matriz-workbench`, `apps/matriz-control`, and packaging metadata required to ship both apps in one local installer

## Intent

Turn Matriz Workbench into an installed, local-first development tool hosted by Matriz Control. The installed experience must open without a login prompt, keep its existing Codex and file-backed capabilities, operate without Matriz Hub, and retain a standalone web mode. Matriz Control must be able to report bounded process failures to Workbench so Workbench can record diagnostics and ask Codex to repair them automatically.

This is internal development tooling. Remote publication, SaaS tenancy, billing, and remote canonical storage are outside the design.

## Architectural decision

Ship two isolated applications in one installer.

- Matriz Control remains the Electron host, installer owner, and process supervisor.
- Matriz Workbench remains an independent Next.js application with its own domain, application, integration, UI, and MCP boundaries.
- The Control installer bundles the Workbench standalone runtime as an application resource.
- Control starts and stops the Workbench runtime and opens it in a dedicated native window.
- The apps exchange only bounded loopback HTTP messages. Neither app imports the other's `src/**` or `app/**`.
- No new shared package is introduced. App-local request and response schemas are acceptable until a third consumer or a stable cross-app contract justifies extraction.

This preserves architectural laws L3, L4, L11, and L12 while making Workbench feel installed inside Control.

## Runtime modes

Workbench resolves one of three explicit modes at startup:

1. `control-desktop`: bundled runtime started by Control.
2. `standalone-web`: manually started Workbench with Hub-backed identity when available.
3. `test`: deterministic isolated behavior used only by automated tests.

The mode is server-owned. Browser input cannot select or upgrade it.

### Control desktop mode

Control generates a cryptographically random Workbench runtime secret for each desktop launch. It starts the bundled Workbench server on `127.0.0.1:3005` with the workspace root, runtime mode, and secret in the child environment. The secret is removed from terminal snapshots, logs, diagnostics, Codex subprocess environments, and rendered HTML.

After the Workbench health endpoint becomes ready, Electron writes the existing HTTP-only Workbench session cookie directly into the dedicated window session and opens the Workbench URL. The user sees no unlock or login screen. Closing Control stops the managed Workbench process. A crashed child may be restarted with a bounded backoff; duplicate children for the same port are not started.

The desktop window is trusted by its Electron owner, loopback origin, generated session, and process ancestry rather than by a hardcoded demo password.

### Standalone web mode

Standalone Workbench remains bound to `127.0.0.1`. Its identity resolver follows this order:

1. verify an existing Hub mock-broker session through the Hub HTTP contract;
2. if Hub is reachable but there is no valid session, offer the normal shared Hub login flow;
3. if Hub is unreachable, create a local demo identity and continue without blocking;
4. if Hub becomes available later, allow the current demo session to be upgraded to the verified Hub identity without changing `.matriz/**` ownership.

The demo actor is visibly labeled `Demo local`. It has one local operator role and no remote-provider authority. Demo is an identity fallback, not a hardcoded credential and not a remote authorization model.

The existing local session cookie remains the HTTP authorization boundary for Workbench routes and Server Actions. Desktop mode provisions it through Electron; standalone mode provisions it after Hub verification or local demo selection. Origin, loopback, rate-limit, CSP, size, revision, and path checks remain active.

## Installation and launch surface

The Control build pipeline produces both Next.js standalone outputs before Electron packaging. Electron Builder includes the Workbench server and static assets under a dedicated resource directory. Development mode may point to an externally started Workbench, but packaged mode must use only the bundled resource.

Control's Apps or Store surface presents Workbench as a built-in app with these states:

- installed and stopped;
- starting;
- ready;
- failed with a bounded diagnostic;
- update required when the bundled health contract is incompatible.

The primary action is `Abrir Workbench`. It starts the managed runtime if needed and focuses the existing native window instead of opening duplicates. Control does not proxy Workbench pages and does not embed Workbench source components.

## Local integration contract

Control and Workbench use an ephemeral capability token distinct from both browser session cookies. It is sent only in server-to-server loopback requests using an authorization header. The token is compared in constant time and never persisted.

Workbench exposes a narrow Control integration surface:

- `GET /api/control/health`: runtime version, compatibility version, mode, and readiness;
- `POST /api/control/diagnostics`: one sanitized process diagnostic;
- `POST /api/control/diagnostics/:id/repair`: explicitly retry an eligible blocked diagnostic;
- `GET /api/control/repairs/next`: the oldest declared-action rerun requested by a completed repair turn, or `204` when none is pending;
- `POST /api/control/repairs/:id/result`: the sanitized exit result of that exact declared action.

The health endpoint reveals no paths, environment values, tokens, cookies, or workspace contents. Diagnostic mutations reject requests that are not from loopback, lack the capability token, exceed the body limit, or fail schema validation.

Control polls the pending-repair endpoint only while Workbench is healthy and at most once per second. A lease in the response prevents two Control loops from claiming the same rerun. Control resolves the original project and action ID through its validated catalog, executes no command supplied by Workbench, and posts the bounded result back. Workbench resolves a diagnostic only from a successful result for the matching diagnostic, action, attempt, and lease.

Control never sends raw environment maps or arbitrary commands. A diagnostic contains only:

- project ID and declared action ID;
- Control session ID;
- normalized status and exit code;
- bounded, redacted output lines;
- occurrence timestamp;
- a stable fingerprint computed from normalized failure evidence.

Absolute workspace paths are converted to existing `mih/...` routes before transport.

## Diagnostic ownership and persistence

Control owns live processes and their in-memory terminal output. Workbench owns durable development context.

Workbench persists accepted diagnostics inside the affected project's `.matriz/diagnostics/**`. A diagnostic records its fingerprint, occurrences, latest sanitized evidence, repair attempts, linked Agent Request, linked Codex run, state, and timestamps. It does not persist secrets, full terminal histories, or unbounded output.

Repeated reports with the same project, action, and fingerprint are deduplicated into one diagnostic. Occurrence count and latest evidence advance atomically. A new fingerprint creates a new diagnostic.

Diagnostic records are operational evidence. They do not automatically change roadmap phases, work-item product state, governance validation, or score 0–100.

## Automated repair policy

A non-zero exit or supervisor failure from an eligible declared action can start automated repair. User cancellation, an intentional process stop, unsupported actions, and failures containing insufficient evidence do not start repair.

For an eligible new diagnostic, Workbench:

1. persists and deduplicates the diagnostic;
2. creates or reuses a bounded Agent Request linked to the affected project;
3. assembles compact context from the diagnostic, target app instructions, linked `.matriz/**` artifacts, and the declared validation action;
4. starts a Codex App Server thread in the affected project;
5. keeps the initial sandbox read-only and network disabled;
6. surfaces normal Codex approval requests for commands or file writes that require greater authority;
7. records run evidence and asks Control to rerun only the original declared action after a successful repair turn;
8. resolves the diagnostic only when that declared action exits successfully.

The automatic trigger is a narrow exception to the previous “threads never run automatically” rule. It applies only to authenticated Control diagnostics and is documented in the Workbench Codex security contract.

### Loop protection

- Maximum three automatic Codex repair attempts per fingerprint.
- Only one active repair per project and fingerprint.
- Exponential cooldown between attempts: 30 seconds, 2 minutes, then 10 minutes.
- A successful rerun resolves the diagnostic and resets no unrelated history.
- Repeated failure after the third attempt moves the diagnostic and Agent Request to `blocked`.
- A human may explicitly retry a blocked diagnostic, creating a new repair revision while preserving earlier evidence.
- Workbench never grants itself approval, disables the sandbox, enables network, or broadens a declared action to arbitrary shell execution.

## Error handling and recovery

- If Workbench fails to start, Control shows the bounded startup error and offers restart.
- If port 3005 is occupied by an incompatible process, Control does not kill it; it reports the conflict.
- If the bundled health version is incompatible, Control refuses diagnostic delivery and shows an update-required state.
- If diagnostic delivery fails, Control retains only a bounded in-memory retry item for the current desktop session.
- If Codex is unavailable, the diagnostic remains persisted and blocked with the runtime diagnostic.
- If Hub is unavailable, Workbench continues as Demo local; this does not impair Control or Codex integration.
- If Control is unavailable, standalone Workbench keeps its planning, file-backed, MCP, and manually started Codex flows. Only Control process diagnostics are absent.

## Security boundaries

- All HTTP servers bind to `127.0.0.1`.
- No hardcoded production or demo password is added.
- Browser requests cannot provide commands, working directories, environment maps, absolute paths, or runtime modes.
- Workbench still writes browser mutations only under the selected `.matriz/**` root.
- Control still resolves executable actions from validated package metadata.
- Secrets are redacted before crossing the integration boundary and are excluded from child environments where not required.
- The Workbench HTTP session and Control-to-Workbench capability use different secrets.
- No endpoint exposes generic shell, filesystem, delete, or source-edit operations.
- Codex remains the only mechanism allowed to change product source, under its normal permission model.

## UI behavior

Workbench displays the active identity source in its shell: `Control local`, the verified Hub user, or `Demo local`. It displays diagnostic repair status without implying that product validation or roadmap outcomes were approved.

Control displays Workbench installation and runtime health, the number of open diagnostics, and the latest repair state. Raw secrets and absolute paths never appear. Opening an existing Workbench window focuses it.

## Compatibility and migration

Existing `.matriz/**` data remains valid. Diagnostic files are additive. Existing standalone users are migrated from mandatory token unlock to the identity resolver; an explicitly configured long `WORKBENCH_LOCAL_TOKEN` remains supported as an emergency standalone unlock during the transition.

Existing Workbench MCP tools, Codex run snapshots, collaboration adapters, manifests, and public contracts remain compatible. Manifest capabilities may be expanded to describe installed runtime and repair coordination, which requires root smoke tests.

No Prisma schema, remote database, cloud service, OAuth provider, or shared product-domain package is added.

## Test strategy

Implementation follows test-driven development.

Workbench unit and integration tests cover runtime-mode resolution, Hub/demo identity fallback, session provisioning, capability authentication, diagnostic schema limits, redaction, deduplication, persistence, retry budget, cooldown, Codex trigger eligibility, and blocked recovery.

Control tests cover bundled runtime path resolution, safe child environment, start/stop/restart behavior, readiness polling, port conflicts, single-window focus, diagnostic mapping, redaction, delivery retries, and incompatibility handling.

A packaged-runtime smoke test proves that Control starts the bundled Workbench, provisions its cookie, opens it without login, and receives a compatible health response. A failure-flow test runs a declared failing fixture, verifies one persisted diagnostic and one Codex request, and proves deduplication and the three-attempt ceiling without granting approvals automatically.

Scoped validation:

- `corepack pnpm --filter @matriz/app-matriz-workbench test`
- `corepack pnpm --filter @matriz/app-matriz-workbench lint`
- `corepack pnpm --filter @matriz/app-matriz-workbench typecheck`
- `corepack pnpm --filter @matriz/app-matriz-workbench build`
- `corepack pnpm --filter @matriz/app-matriz-control test`
- `corepack pnpm --filter @matriz/app-matriz-control lint`
- `corepack pnpm --filter @matriz/app-matriz-control typecheck`
- `corepack pnpm --filter @matriz/app-matriz-control build`
- `corepack pnpm test:smoke` when manifests, packaging-wide contracts, or public integration metadata change

## Delivery slices

1. Workbench runtime identity modes and demo fallback.
2. Control-managed bundled Workbench process and native launch.
3. Authenticated diagnostic ingestion and durable Workbench records.
4. Automated Codex repair orchestration with loop protection.
5. Installed-app UI, recovery states, packaging proof, and documentation.

Each slice must be independently testable and preserve standalone Workbench operation.

## Success criteria

- Installing Matriz Control installs a runnable Workbench without a second installer.
- Opening Workbench from Control never asks for login and does not require Hub.
- Standalone web mode uses Hub identity when available and Demo local when Hub is unavailable.
- Workbench retains local planning, MCP, and Codex behavior without Control or Hub.
- A declared Control process failure creates one sanitized, deduplicated Workbench diagnostic.
- An eligible diagnostic starts a bounded Codex repair flow automatically.
- Repairs never self-approve elevated actions and stop automatically after three failed attempts.
- A successful rerun resolves the diagnostic with observable evidence.
- No app imports another app's internals, no domain moves into a shared package, and no secrets or build artifacts are committed.

## Artifact impact

This work changes product direction and therefore belongs in the Workbench and Control roadmaps once implementation begins. Executable slices belong in backlog items; runtime events and verification results belong in activity. Score remains unchanged until an existing explicit goal is fully satisfied with observable evidence.
