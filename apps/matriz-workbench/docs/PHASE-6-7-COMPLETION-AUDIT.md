# Phase 6–7 completion audit

Date: 2026-07-29

This ledger separates implemented evidence from decision-dependent work. It is
not a substitute for tests or runtime proof; it points to the authoritative
artifacts used to verify each claim.

## Phase 6 — integrated Codex

| Requirement                                     | Status            | Evidence                                                                        |
| ----------------------------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| Runtime discovery and fail-closed diagnostics   | Proven            | `src/integration/codex/app-server-client.ts`, `src/cli/health.ts`, client tests |
| Start and resume threads for a selected project | Proven            | `src/application/codex-run-manager.ts`, manager tests                           |
| Associate thread/turn/run with an agent request | Proven            | Codex run schema/store and agent request detail page                            |
| Stream progress to the browser                  | Proven            | SSE events route and run detail UI                                              |
| Render approval requests and submit decisions   | Proven            | approval Route Handler and run detail UI                                        |
| Show diff, commands, files and checks           | Proven            | run presenter/detail view and delivery evidence presenter                       |
| Cancel an active turn                           | Proven            | cancel Route Handler and manager lifecycle                                      |
| Exclude parent application secrets from Codex   | Proven            | child-environment allowlist and App Server client tests                         |
| Persist run history across reload               | Proven            | `.matriz/agents/runs/**` store and tests                                        |
| Real local App Server proof                     | Proven on Windows | `docs/CODEX-APP-SERVER.md`                                                      |

Phase 6 is complete for the local-first boundary. It does not imply remote
multi-user execution or a cloud credential broker.

## Phase 7 — collaboration and hardening

| Requirement                                    | Status                                 | Evidence                                                                                                      |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Deterministic GitHub issue drafts              | Proven                                 | issue draft service/tests and receipt store/tests                                                             |
| PR and Vercel preview evidence                 | Proven                                 | delivery artifact store/tests and evidence presenter                                                          |
| Completion guard based on criteria and checks  | Proven                                 | delivery domain tests                                                                                         |
| Optional Slack/Teams outbox                    | Proven                                 | outbox store/tests and notification UI                                                                        |
| Provider-neutral delivery lifecycle            | Proven                                 | dispatcher/store tests and provider contract                                                                  |
| Provider failure does not block canonical work | Proven                                 | fake-provider failure/retry tests                                                                             |
| Local operational health                       | Proven                                 | health service, CLI and settings UI                                                                           |
| Bounded audit and redaction                    | Proven                                 | repository queries, presenters and redaction tests                                                            |
| Local abuse controls                           | Proven                                 | rate limiter and Codex concurrency tests                                                                      |
| Browser containment                            | Proven                                 | nonce CSP tests plus production header/console proof                                                          |
| Endpoint authorization coverage                | Proven                                 | structural Route Handler and Server Action contract test                                                      |
| Cross-app boundaries for all six apps          | Proven                                 | global smoke and `verify-app-boundaries.ts` now enumerate `matriz-workbench`                                  |
| Backup and recovery                            | Documented                             | `docs/RECOVERY.md`                                                                                            |
| Remote multi-user collaboration                | Decision pending                       | `docs/ADR-REMOTE-COLLABORATION-BOUNDARY.md`                                                                   |
| Real Slack or Teams delivery                   | Product/provider choice pending        | `docs/NOTIFICATION-PROVIDER-CONTRACT.md`                                                                      |
| Encrypted provider credentials                 | Architecture choice pending            | no secret is currently accepted or persisted                                                                  |
| Remote privacy deletion/retention              | Identity and storage decisions pending | Phase 7D decision gate                                                                                        |
| Linux clean-clone definition                   | Proven                                 | `.github/workflows/matriz-workbench.yml` uses Ubuntu, Node 22, pnpm 9.12, frozen install and all scoped gates |
| Linux clean-clone execution                    | Evidence pending                       | workflow cannot run against the current uncommitted Workbench; first green GitHub run is still required       |

## Current safe release boundary

The verified product is a single-operator, loopback-only Workbench with Git and
`.matriz/**` as canonical state. It can coordinate Codex and local agents,
record delivery evidence and maintain a durable notification outbox.

It must not be advertised or deployed as:

- a remotely authenticated multi-tenant service;
- a distributed queue;
- a source of Slack/Teams delivery truth without a connected provider;
- a cloud secret store;
- a Linux-verified build until an independent runner completes the gate.

## Remaining decision gates

1. Select Slack or Teams for the first real outbound adapter and approve its
   credential owner/secret manager.
2. Approve or revise the Phase 7D identity, tenant, database, merge and privacy
   decisions.
3. Commit/push the Workbench and obtain the first green
   `matriz-workbench / Linux clean-clone gate` run.

Until those choices exist, further code must preserve the current local-first
contract rather than simulate remote capabilities.
