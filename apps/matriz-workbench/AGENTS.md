# AGENTS.md — Matriz Workbench

## Objective

Operate the local-first coworking surface without crossing app boundaries.

## Read order

1. root `docs/architectural-laws.md`
2. `docs/AGENT-START-HERE.md`
3. `docs/agent-handbook/README.md`
4. `README.md`
5. `src/manifest/manifest.ts`
6. `src/bootstrap/index.ts`

The handbook is mandatory. Knowing the monorepo architecture is not enough to
operate the Workbench correctly.

## Boundaries

- Project metadata may be read from `apps/*/package.json`, `README.md` and
  `.matriz/**`.
- Never import or execute another app's `src/**` or `app/**`.
- Browser mutations may write only inside the selected app's `.matriz/**`.
- The Workbench never runs shell commands or edits product source code.
- MCP exposes named workflow tools only; never expose generic filesystem access.

## Completion

Before marking a Workbench task complete, record changed files and verification
commands in the agent request and activity log.

Roadmap, backlog, activity and score are different artifacts. A change may be
registered without changing the score. Never award a point without observable
evidence, and never hide a regression to preserve the total.

## Engineering Operations

- Use `AgentRequest.id` as the canonical execution correlation identifier.
- Before mutation, declare `executionMode`, intended files/surfaces, planned checks and owner.
- Let the Workbench observe the Git baseline; do not invent `HEAD` or dirty paths.
- A claim uses a bounded lease. Renew it only at a material checkpoint.
- Treat `interrupted`, `blocked`, `failed`, `cancelled` and `completed` as different facts.
- Plan-only completion records no changed files and no executed checks.
- Reconciliation reports divergence; it never edits Git or approves governance state.
- Only a person may approve execution, product, validation, documentation, score, gates or release.

## Validation

Distribution: `matriz-workbench-electron`, Windows `com.matriz.workbench`, tag `workbench-v*`. Read `../../docs/release-distribution.md` first.

- `pnpm --filter @matriz/app-matriz-workbench lint`
- `pnpm --filter @matriz/app-matriz-workbench typecheck`
- `pnpm --filter @matriz/app-matriz-workbench test`
- `pnpm --filter @matriz/app-matriz-workbench build`
