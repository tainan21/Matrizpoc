# Recovery and local health

The Workbench has no database and stores no provider credentials. Recovery is
therefore a Git and file-protocol operation, not an application-specific backup
format.

## Read-only health check

From the repository root:

```powershell
pnpm --filter @matriz/app-matriz-workbench health
```

If the local pnpm shim is unhealthy on Windows, use the pinned workspace
runtime directly after following `docs/WINDOWS.md`:

```powershell
node_modules\.bin\tsx apps\matriz-workbench\src\cli\health.ts
```

The command reports:

- detected, initialized and corrupted projects;
- Codex runtime availability and local concurrency capacity;
- notification opt-in, queue, failure and delivery counts;
- invalid integration records.

The project activity page supports bounded filters by text, actor, entity and
date, plus a read-only retention summary. Malformed JSONL lines are skipped
during queries and surfaced through recovery inspection rather than executed or
silently rewritten.

It exits non-zero only for corrupted project workspaces or invalid integration
state. A disconnected provider adapter and a missing Codex runtime are reported
truthfully but do not make planning data unrecoverable.

## Backup contract

Version these paths:

```text
apps/<app>/.matriz/project.json
apps/<app>/.matriz/roadmap.json
apps/<app>/.matriz/context.json
apps/<app>/.matriz/backlog/**
apps/<app>/.matriz/docs/**
apps/<app>/.matriz/agents/**
apps/<app>/.matriz/activity/**
apps/<app>/.matriz/integrations/**
```

Do not add `.env`, provider tokens, runtime logs, `.runtime/**`, `.next/**` or
browser session data. Integration receipts are metadata and URLs; credentials
must remain outside `.matriz`.

## Recovery drill

Run this drill before a remote adapter or provider delivery adapter is released:

1. Confirm `git status --short -- apps/*/.matriz` contains only intended data.
2. Record the commit that represents the recovery point.
3. Create a clean clone in a separate directory.
4. Set a fresh `WORKBENCH_LOCAL_TOKEN`; never copy the original token.
5. Run the health command, app tests and production build.
6. Open one project, one task, one agent run and its activity history.
7. Verify issue/PR/preview receipts resolve without becoming canonical state.
8. Keep provider delivery disabled; a recovery drill must not send messages.

The repository workflow `.github/workflows/matriz-workbench.yml` automates the
non-interactive portion of this drill on Ubuntu with Node 22, pinned pnpm,
frozen dependencies, scoped tests/typecheck/lint/build, read-only health and
the monorepo smoke suite. A configured workflow is not execution evidence: the
gate is complete only after its first green run from committed sources.

## Corrupted record procedure

1. Stop mutations for the affected project.
2. Use the settings health view to identify the project/integration boundary.
3. Inspect the affected JSON as data; do not execute it.
4. Compare it with the last known-good Git revision.
5. Restore only the exact affected file from the chosen revision.
6. Run health again, then inspect activity and linked evidence.
7. Record the incident and recovery revision in a technical decision or
   activity entry.

Never restore all of `apps/**` or the repository root to fix one record.

## Retention

The current policy is deliberately manual and Git-backed:

- activity JSONL is append-only and retained with project history;
- delivered/canceled notification records remain auditable;
- no automatic deletion runs in V1;
- privacy deletion and remote audit retention require the Phase 7D identity and
  tenancy decisions before implementation.
