# ADR: remote collaboration boundary

Status: **proposed decision gate**  
Date: 2026-07-28

## Context

The file adapter is deliberately optimized for one local working tree, Git
portability and agent-readable context. It is not a safe substitute for
multi-user identity, remote authorization, distributed locks or privacy
deletion.

## Decision

Keep `.matriz/**` canonical for the local mode. Add remote collaboration only
behind an app-local repository port with two explicit adapters:

1. `FileWorkspaceRepository` for local/offline operation and complete export;
2. `RemoteWorkspaceRepository` for authenticated multi-user operation.

Do not mount the current filesystem repository in a serverless deployment and
do not emulate tenants with folders or browser-provided organization IDs.

Every remote record must carry server-derived `organizationId`, `projectId`,
actor identity, revision and audit timestamps. Authorization is enforced in the
remote application service before repository access. Export must reproduce the
complete public file protocol without provider secrets.

## Decisions still required

Implementation must not start until the product owner chooses:

- identity provider, account recovery and session policy;
- tenant membership, invitation and role model;
- database region, retention and deletion requirements;
- offline merge behavior beyond optimistic conflict reporting;
- audit visibility and retention;
- secret manager and provider credential ownership.

## Recommended minimal stack

Use one relational database with row-level tenant constraints and ordinary
optimistic revisions before considering multiple databases. Keep comments,
assignments and membership in the remote domain; keep provider receipts as
projections. Introduce a queue only for genuinely asynchronous provider
delivery.

## Consequences

- local mode remains zero-database and recoverable through Git;
- remote mode gets real identity and concurrency semantics;
- the UI can consume the same view models;
- adapters require contract tests against the same behavior;
- automatic bidirectional merge between Git files and remote state remains a
  non-goal until a separate conflict model is approved.

## Review trigger

Review this ADR when the first second human must edit the same project remotely,
not merely when a cloud preview is desired.
