# Matriz Control Global Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/matriz-control` as a local cockpit with a safe multi-session terminal dock that opens from the bottom or right.

**Architecture:** A Next.js 16 app owns an app-local project catalog and in-memory process supervisor. Same-origin route handlers expose validated session operations; a persistent client provider renders the global dock and polls bounded snapshots while sessions are active.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6, Vitest 2, Node `child_process`, existing Matriz design tokens.

**Spec:** `docs/superpowers/specs/2026-08-24-matriz-control-global-terminal-design.md`

## Global Constraints

- Matriz Control uses port `3008`.
- Never import another app's `src/**` or `app/**`.
- Keep process orchestration app-local; do not create a shared package.
- The browser sends project/action identifiers, never raw commands, environment maps, or working directories.
- Process/session state is memory-only; dock preferences are browser-local.
- Do not restore OS processes after a Control restart.

---

### Task 1: App scaffold and project catalog

**Files:**
- Create: `apps/matriz-control/package.json`, `apps/matriz-control/tsconfig.json`, `apps/matriz-control/next.config.mjs`, `apps/matriz-control/vitest.config.ts`, `apps/matriz-control/next-env.d.ts`
- Create: `apps/matriz-control/README.md`, `apps/matriz-control/AGENTS.md`, `apps/matriz-control/docs/AGENT-START-HERE.md`
- Create: `apps/matriz-control/src/domain/terminal.ts`
- Create: `apps/matriz-control/src/integration/projects/project-catalog.ts`
- Test: `apps/matriz-control/src/integration/projects/project-catalog.test.ts`

**Interfaces:**
- Produces: `TerminalProject`, `TerminalAction`, `listTerminalProjects(rootDir)`, `resolveTerminalAction(rootDir, projectId, actionId)`.

- [ ] Write a failing catalog test that creates temporary app `package.json` files and proves only `dev`, `lint`, `typecheck`, and `test` actions are exposed.
- [ ] Run `pnpm --filter @matriz/app-matriz-control test -- project-catalog.test.ts`; expect failure because the catalog does not exist.
- [ ] Implement strict identifiers, real-path containment, deterministic app discovery, and server-owned command/cwd resolution.
- [ ] Re-run the catalog test; expect PASS.
- [ ] Commit the scaffold and catalog.

### Task 2: In-memory process supervisor

**Files:**
- Create: `apps/matriz-control/src/application/terminal-supervisor.ts`
- Test: `apps/matriz-control/src/application/terminal-supervisor.test.ts`

**Interfaces:**
- Consumes: `resolveTerminalAction(rootDir, projectId, actionId)`.
- Produces: `TerminalSupervisor.start`, `.list`, `.get`, `.write`, `.stop`, `.restart`, `.close` and `getTerminalSupervisor()`.

- [ ] Write failing tests using an injected runtime to prove lifecycle transitions, duplicate-start focus, input forwarding, stop behavior, and a 400-line circular buffer.
- [ ] Run the supervisor test; expect missing implementation failure.
- [ ] Implement the supervisor with an injected `ProcessRuntime`, default Node spawn adapter, redacted bounded output, 8-session limit, and explicit process-tree stop.
- [ ] Re-run the supervisor tests; expect PASS.
- [ ] Commit the supervisor.

### Task 3: Safe session API

**Files:**
- Create: `apps/matriz-control/src/application/http.ts`
- Create: `apps/matriz-control/app/api/projects/route.ts`
- Create: `apps/matriz-control/app/api/terminal/sessions/route.ts`
- Create: `apps/matriz-control/app/api/terminal/sessions/[sessionId]/route.ts`
- Create: `apps/matriz-control/app/api/terminal/sessions/[sessionId]/input/route.ts`
- Create: `apps/matriz-control/app/api/terminal/sessions/[sessionId]/restart/route.ts`

**Interfaces:**
- Produces JSON snapshots through `GET /api/terminal/sessions`; accepts only `{projectId, actionId}` on create and `{input}` on the bounded input route.

- [ ] Write route-level validation tests for malformed identifiers, unknown actions, oversized input, and unknown sessions.
- [ ] Run the route tests; expect missing handlers.
- [ ] Implement Zod-free narrow parsers, no-store responses, same-origin mutation checks, and status mapping.
- [ ] Re-run route tests; expect PASS.
- [ ] Commit the API.

### Task 4: Persistent terminal dock

**Files:**
- Create: `apps/matriz-control/src/ui/terminal/terminal-context.tsx`
- Create: `apps/matriz-control/src/ui/terminal/terminal-dock.tsx`
- Create: `apps/matriz-control/src/ui/terminal/terminal-preferences.ts`
- Test: `apps/matriz-control/src/ui/terminal/terminal-preferences.test.ts`

**Interfaces:**
- Produces: `TerminalProvider`, `useTerminal()`, `TerminalDock`, and parsed `{open, placement, bottomSize, rightSize, activeSessionId}` preferences.

- [ ] Write failing preference tests for corrupt storage, clamping, and placement parsing.
- [ ] Run preference tests; expect missing module.
- [ ] Implement the provider, active-session polling, `Ctrl+J`, tab selection, input form, stop/restart/close actions, bottom/right placement, keyboard sizing, and local-storage preferences.
- [ ] Re-run preference tests; expect PASS.
- [ ] Commit the dock.

### Task 5: Control shell, Apps flow, and full Terminal page

**Files:**
- Create: `apps/matriz-control/app/layout.tsx`, `apps/matriz-control/app/globals.css`, `apps/matriz-control/app/page.tsx`
- Create: `apps/matriz-control/app/apps/page.tsx`, `apps/matriz-control/app/terminal/page.tsx`
- Create: `apps/matriz-control/app/workspace/page.tsx`, `apps/matriz-control/app/actions/page.tsx`, `apps/matriz-control/app/store/page.tsx`, `apps/matriz-control/app/doctor/page.tsx`, `apps/matriz-control/app/settings/page.tsx`
- Create: `apps/matriz-control/src/ui/control-shell.tsx`, `apps/matriz-control/src/ui/apps-console.tsx`, `apps/matriz-control/src/ui/terminal/terminal-page.tsx`

**Interfaces:**
- Consumes: project and session APIs plus `useTerminal()`.
- Produces: operational navigation, Start-to-focus behavior, preview link, global status, empty states, and full terminal management.

- [ ] Build the shell matching the supplied dark purple cockpit reference with semantic landmarks and responsive columns.
- [ ] Build Apps selection and make Start call `openSession(projectId, "dev")`.
- [ ] Build the full Terminal page over the same provider sessions.
- [ ] Add meaningful bounded placeholder pages for the other approved destinations without inventing new domain behavior.
- [ ] Run app tests and typecheck; expect PASS.
- [ ] Commit the product slice.

### Task 6: Manifest, registry, documentation, and verification

**Files:**
- Create: `apps/matriz-control/public-contract.ts`, `apps/matriz-control/src/manifest/manifest.ts`, `apps/matriz-control/src/bootstrap/index.ts`
- Modify: `packages/foundation/constants/src/index.ts`
- Modify: `packages/platform/config/src/index.ts`
- Modify: `apps/matriz-hub/src/bootstrap/index.ts`
- Modify: `tests/smoke/manifests.test.ts`, `tests/smoke/registry.test.ts`
- Modify: `docs/DECISION-LOG.md`

**Interfaces:**
- Produces registered app id `matriz-control`, base URL `http://localhost:3008`, public manifest-only contract, and an explicit architectural decision.

- [ ] Write failing manifest/registry expectations for the ninth app and port 3008.
- [ ] Run `pnpm test:smoke`; expect registration failures.
- [ ] Add the app id, manifest, bootstrap registration, base URL, and decision-log entry without changing other product domains.
- [ ] Run app test, lint, typecheck, and build.
- [ ] Run `pnpm test:smoke` and boundary checks; expect PASS.
- [ ] Inspect `git diff --check` and commit only Matriz Control-related files.
