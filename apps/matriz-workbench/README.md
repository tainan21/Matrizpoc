# Matriz Workbench

Local-first coworking tool for a human, Codex and local agents.

Discovery includes every valid `apps/*/package.json` and the reserved
repository-root project `matriz-infra-hub`. Each one owns an isolated
`.matriz/**` workspace.

External repositories remain independent. The portable registry records their
identity and document policy, while a Git-ignored local binding makes a
specific checkout available read-only. The Workbench never scans the computer
for repositories.

## Ownership (L9)

- **Responsibility:** discover repository apps and manage their roadmap,
  backlog, documentation, decisions, agent requests and activity as Git-backed
  files.
- **Coordinator artifacts:** the repository-root `.matriz/inbox/**` and
  `.matriz/sprints/**` back the global `/work/inbox`, `/work/backlog` and
  `/work/sprints` surfaces. They reference project work without copying it.
- **Exposes:** `public-contract.ts` → `{ manifest }` only; MCP named resources
  and workflow tools over STDIO.
- **Does not expose:** filesystem primitives, source editing, shell execution or
  product-domain internals.
- **May import:** stable `@matriz/*` infrastructure contracts.
- **Must not import:** another app's `src/**` or `app/**`.

## Local start

```powershell
$env:WORKBENCH_LOCAL_TOKEN = "choose-a-long-local-secret"
pnpm --filter @matriz/app-matriz-workbench dev
```

Open `http://localhost:3005` and unlock with the same token. Use `localhost` consistently so the local Hub session can be shared safely between ports.

For local development and automated tests, the short token `1234` is also
accepted to make validation faster. This shortcut is disabled when
`NODE_ENV=production`; production continues to require
`WORKBENCH_LOCAL_TOKEN` with at least 16 characters.

When started as an installed app by Matriz Control, Workbench is provisioned
automatically with an internal loopback session and does not show a login
screen. When started standalone without a Hub session or configured token, it
uses a local Demo identity; this is an internal development fallback, not a
commercial account. The web version and its normal Hub session remain
available.

The session cookie is HTTP-only and `SameSite=Strict`. It is intentionally not
marked `Secure` on the default loopback HTTP server. Set
`WORKBENCH_COOKIE_SECURE=true` only behind a trusted HTTPS terminator.

On Windows, confirm that the repository's pinned pnpm 9 is the executable being
used before installing dependencies. The diagnostic and recovery commands are
documented in `docs/WINDOWS.md`.

## Storage

The source of truth is `apps/<app>/.matriz/**`. JSON stores structured state,
Markdown stores human knowledge, and monthly JSONL files store append-only
activity. No database or internet connection is required.

See `docs/AGENT-START-HERE.md`, `docs/FILE-PROTOCOL.md` and `docs/MCP.md`.
O launcher compartilhado de utilitários está descrito em `docs/PRACTICIES.md`.
Federated repositories, blueprints and Sites are described in
`docs/FEDERATED-PORTFOLIO.md`, `docs/PROJECT-BLUEPRINTS.md` and
`docs/SITES-INTEGRATION.md`.
The latest verified implementation snapshot is
`docs/IMPLEMENTATION-FEDERATED-PORTFOLIO-2026-07-30.md`.
The Matriz Lib UI package boundary is documented in
`docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md`.
The Workbench visual reform, its executable plan and the reusable agent prompt
are documented in `docs/design/WORKBENCH-VISUAL-REFORM-2026-08-04.md`,
`docs/plans/2026-08-04-workbench-visual-reform-implementation.md` and
`docs/design/AGENT-PROMPT-WORKBENCH-VISUAL-REFORM.md`.
The evidence-based planning method is documented in `docs/SCORE-0-100.md`.
Agents must also read `docs/agent-handbook/README.md`, which explains the
product language, operating protocol, coworking model, freedom and security
boundaries.

## Integrated Codex

Agent request details can start or resume a local Codex App Server thread.
Streaming, plan updates, command evidence, approvals and the aggregated diff
stay local. Threads start read-only and never run automatically.

See `docs/CODEX-APP-SERVER.md`. Control hosting, identity and automatic repair
are documented in `docs/CONTROL-INTEGRATION.md`.

## Optional collaboration

GitHub issue drafts and Codex handoffs are available without making GitHub the
source of truth. Approved deliveries can be linked back through atomic,
revisioned issue, pull request and preview receipts. The local notification
outbox is opt-in and stores no provider credentials. See
`docs/COLLABORATION-ADAPTERS.md` and `docs/PHASE-7-ROADMAP.md`.

Operational health and the clean-clone recovery drill are documented in
`docs/RECOVERY.md`.
