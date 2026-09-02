# Matriz Local Infrastructure Operational Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the managed Matriz PostgreSQL, Garnet, and NATS services on this Windows host and produce redacted evidence that the stack is healthy, recoverable, and does not alter the external PostgreSQL listener on port 5432.

**Architecture:** Execute the already-implemented Matriz Control installation flow instead of invoking privileged helpers directly. Treat Windows service state, listener ownership, migration checksums, seed receipts, and recovery validation as acceptance evidence; do not change product code unless a failing contract demonstrates a real defect.

**Tech Stack:** Windows Services/SCM, PowerShell 7, Electron 44, PostgreSQL 17.4, Garnet 2.1.5, NATS JetStream 2.14.5, Prisma 5.20, pnpm 9.

**Spec:** `docs/MATRIZ-DATA-PLATFORM-COCKPIT.md`

## Global Constraints

- Preserve the external PostgreSQL service and listener at `127.0.0.1:5432` exactly as found.
- Operate only `MatrizPostgres17`, `MatrizGarnet`, and `MatrizNats` whose executable paths resolve under `C:\ProgramData\Matriz\Infrastructure`.
- Never invoke `apps/matriz-control/desktop/infrastructure-helper.ps1` manually.
- Never print, copy, commit, or paste DPAPI secrets, passwords, connection URLs, tokens, dumps, logs, build output, or cache artifacts.
- PostgreSQL managed endpoint is `127.0.0.1:55432/matriz`; Garnet is `127.0.0.1:46379`; NATS is `127.0.0.1:54222`; NATS monitoring is `127.0.0.1:58222`.
- Installation and lifecycle actions require the Matriz Control preview, one-use confirmation token, and the human UAC confirmation.
- A start action never applies migrations implicitly.
- Stop at the first ownership mismatch, checksum failure, migration drift, invalid backup, or unexpected change to port `5432`.
- Repository work must preserve the existing uncommitted Matriz Control changes in the canonical checkout.

---

## File Structure

- Create: `docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md` — redacted acceptance evidence and remaining failures.
- Read/execute: `apps/matriz-control/desktop/windows-infrastructure-host.ts` — ownership-aware host boundary.
- Read/execute: `apps/matriz-control/desktop/infrastructure-helper.ps1` — elevated installer invoked only by the host.
- Read/execute: `apps/matriz-control/desktop/database-migration-apply-helper.ps1` — migration authority.
- Read/execute: `apps/matriz-control/desktop/database-recovery-helper.ps1` — backup and temporary restore validation.
- Read/execute: `apps/matriz-control/desktop/windows-local-development-seed-host.ts` — local seed orchestration.
- Read/execute: `apps/matriz-control/src/modules/infrastructure/**` — cockpit, service manager, status and contracts.
- Read: `docs/infrastructure/windows-services-runbook.md` and `docs/infrastructure/postgres-recovery-runbook.md` — operating procedures.

### Task 1: Capture the immutable pre-install baseline

**Files:**

- Create: `docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md`

**Interfaces:**

- Consumes: Windows service inventory, TCP listener inventory, PostgreSQL binary version.
- Produces: Redacted baseline containing service names, statuses, start modes, listener ports, owning PIDs, executable fingerprints, and timestamps.

- [ ] **Step 1: Verify the working tree and select an isolated execution worktree**

Run:

```powershell
git status --short
git worktree list --porcelain
```

Expected: the canonical checkout's existing changes remain visible and untouched; execution uses a worktree created with `superpowers:using-git-worktrees`.

- [ ] **Step 2: Capture service and listener baseline without credentials**

Run:

```powershell
$ports = 5432,55432,46379,54222,58222
Get-Service -Name 'MatrizPostgres17','MatrizGarnet','MatrizNats','postgresql*' -ErrorAction SilentlyContinue |
  Select-Object Name,Status,StartType
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -in $ports |
  Select-Object LocalAddress,LocalPort,OwningProcess
Get-CimInstance Win32_Service |
  Where-Object Name -in 'MatrizPostgres17','MatrizGarnet','MatrizNats' |
  Select-Object Name,State,StartMode,PathName
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' --version
```

Expected: external PostgreSQL is present on `5432`; managed ports are closed before installation; no credential is displayed.

- [ ] **Step 3: Write the baseline evidence**

Create the acceptance document with the headings below. Under each heading,
record the exact observed non-secret value from Step 2; do not copy command
lines that contain connection strings or credentials.

```markdown
# Matriz Local Infrastructure Operational Acceptance

**Date:** 2026-09-01
**Host:** Windows x64
**Result:** IN PROGRESS

## Protected external baseline

- PostgreSQL 5432 service
- Status and start mode
- Listener PID
- Executable image fingerprint with command-line credentials removed

## Managed stack

| Service          | Expected endpoint       | Install | Health  | Ownership |
| ---------------- | ----------------------- | ------- | ------- | --------- |
| MatrizPostgres17 | 127.0.0.1:55432         | pending | pending | pending   |
| MatrizGarnet     | 127.0.0.1:46379         | pending | pending | pending   |
| MatrizNats       | 127.0.0.1:54222 / 58222 | pending | pending | pending   |

## Gates

- [ ] External 5432 unchanged
- [ ] Installation receipt valid
- [ ] Managed services healthy
- [ ] Migrations clean
- [ ] Seed and Identity healthy
- [ ] Backup and temporary restore valid
- [ ] Garnet authentication valid
- [ ] NATS JetStream and scoped credentials valid
```

- [ ] **Step 4: Review the evidence for forbidden content**

Run:

```powershell
rg -n "(?i)(password|secret|token|authorization|postgres(?:ql)?://|nats://|redis://)" docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md
```

Expected: no match containing a value; headings or explicit redaction statements are allowed only when no secret follows them.

### Task 2: Verify installer contracts before elevation

**Files:**

- Test: `apps/matriz-control/src/modules/infrastructure/integration/windows-installer-contract.test.ts`
- Test: `apps/matriz-control/src/modules/infrastructure/integration/windows-recovery-contract.test.ts`
- Test: `apps/matriz-control/src/modules/infrastructure/application/infrastructure-service-manager.test.ts`
- Test: `apps/matriz-control/src/modules/infrastructure/application/database-migration-manager.test.ts`
- Test: `apps/matriz-control/src/modules/infrastructure/application/local-development-seed-manager.test.ts`

**Interfaces:**

- Consumes: fixed service catalog, PowerShell helpers, one-use confirmation managers.
- Produces: passing contract suite and compiled desktop host before any machine mutation.

- [ ] **Step 1: Regenerate Prisma clients and validate migrations**

Run:

```powershell
corepack pnpm prisma:generate
corepack pnpm prisma:validate
corepack pnpm verify:infrastructure
```

Expected: all eight schemas validate and infrastructure contracts are internally
consistent. Do not run `prisma:migrate:test` unless two explicitly disposable
database URLs have first been verified; that command deploys and mutates both
test databases by design.

- [ ] **Step 2: Run the focused infrastructure contracts**

Run:

```powershell
$tests = @(
  'src/modules/infrastructure/integration/windows-installer-contract.test.ts',
  'src/modules/infrastructure/integration/windows-recovery-contract.test.ts',
  'src/modules/infrastructure/application/infrastructure-service-manager.test.ts',
  'src/modules/infrastructure/application/database-migration-manager.test.ts',
  'src/modules/infrastructure/application/local-development-seed-manager.test.ts'
)
corepack pnpm --filter @matriz/app-matriz-control test -- $tests
```

Expected: PASS; catalog contains no port `5432`; service names and hashes are fixed; confirmation tokens are single-use and expire.

- [ ] **Step 3: Compile the desktop host**

Run:

```powershell
corepack pnpm --filter @matriz/app-matriz-control desktop:compile
```

Expected: exit code `0` with no TypeScript or bundle errors.

- [ ] **Step 4: Record the preflight result**

Add commands, exit codes, test counts, and timestamp to the acceptance document. Do not paste verbose logs.

### Task 3: Install the managed stack through Matriz Control

**Files:**

- Execute: `apps/matriz-control/package.json` script `desktop:dev`
- Update: `docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md`

**Interfaces:**

- Consumes: passing preflight and human UAC approval.
- Produces: three owned Windows services, DPAPI-protected local vault, installation receipt, and healthy listeners.

- [ ] **Step 1: Launch Matriz Control Desktop**

Run:

```powershell
corepack pnpm --filter @matriz/app-matriz-control desktop:dev
```

Expected: Matriz Control opens; the terminal remains attached to the development process.

- [ ] **Step 2: Preview installation in the human interface**

Open **Infrastructure → Overview → Instalar stack Matriz**. Verify the preview names only `MatrizPostgres17`, `MatrizGarnet`, and `MatrizNats`, with the four managed ports and `%ProgramData%\Matriz\Infrastructure` ownership root.

Expected: one confirmation with a 30-second expiry; no command, URL, path, or credential is editable in the renderer.

- [ ] **Step 3: Confirm and accept the UAC prompt**

The human accepts the single Windows elevation prompt. Do not automate secure-desktop interaction and do not run the helper outside Control.

Expected: official Garnet/NATS downloads match pinned byte sizes and SHA-256; PostgreSQL reuses version 17 binaries but creates a separate cluster on `55432`.

- [ ] **Step 4: Wait for health without repeated polling**

Use the cockpit status refresh at bounded intervals. Expected final states:

```text
MatrizPostgres17 healthy 127.0.0.1:55432
MatrizGarnet     healthy 127.0.0.1:46379
MatrizNats       healthy 127.0.0.1:54222,127.0.0.1:58222
```

- [ ] **Step 5: Verify ownership and the protected listener**

Run the Task 1 inventory commands again. Resolve each managed `PathName` and assert it remains under `C:\ProgramData\Matriz\Infrastructure`. Compare the external `5432` service, PID, start mode, and image path with the baseline.

Expected: protected service is unchanged; managed services use Automatic (Delayed Start).

### Task 4: Apply migrations, seed local identities, and inject environments

**Files:**

- Execute: `apps/matriz-control/desktop/database-migration-apply-helper.ps1` via Control.
- Execute: `tooling/scripts/seed-local-dev.ts` via Control.
- Execute: `apps/matriz-identity` local seed via Control.
- Update: `docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md`.

**Interfaces:**

- Consumes: healthy managed PostgreSQL and DPAPI bootstrap authority.
- Produces: clean migration ledger, local demo identities, and per-app process environments without committed secrets.

- [ ] **Step 1: Preview and apply migrations in Control**

Open **Infrastructure → Migrations**, refresh status, review pending schema names and checksums, then confirm once.

Expected: migrations apply in fixed schema order; release markers are written; final state is `clean`, not `pending` or `drifted`.

- [ ] **Step 2: Seed the local environment through Control**

Open **Infrastructure → Database → Popular ambiente local**, preview, confirm, and wait for the bounded seed workflow.

Expected sequence:

```text
matriz:seed:dev
@matriz/app-matriz-identity seed:local
identity readiness
product readiness
```

- [ ] **Step 3: Export/inject app environments through Control**

Preview the local environment action for `matriz-identity`, `matriz-hub`, and `seumei`; confirm only ignored local files or process injection targets reported by the host.

Expected: no secret appears in Git status, logs, documentation, or renderer payloads.

- [ ] **Step 4: Verify schema, role, and migration inventory with the status helper**

Use the Control migration/status action. Record only schema names, role names, RLS counts, migration states, and release markers.

Expected schemas:

```text
core hub spot seumei contracts willdash ops pay
```

Expected role classes per schema: migration and runtime; worker role for declared event domains; all runtime/worker roles show `NOBYPASSRLS`.

### Task 5: Prove cache, event transport, and recovery

**Files:**

- Execute: `apps/matriz-control/desktop/database-recovery-helper.ps1` via Control.
- Execute: `apps/matriz-control/desktop/outbox-diagnostics-helper.ps1` via Control.
- Update: `docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md`.

**Interfaces:**

- Consumes: migrated and seeded stack.
- Produces: authenticated Garnet/NATS proof, valid backup catalog entry, temporary restore proof, and outbox diagnostics.

- [ ] **Step 1: Verify Garnet and NATS health from Control**

Use the cockpit health action and NATS monitoring view. Record status, version, JetStream enabled state, and redacted authentication result.

Expected: anonymous Garnet access is denied; app-scoped cache credentials can only access their namespace; NATS reports JetStream enabled and rejects undeclared subjects.

- [ ] **Step 2: Create a guard backup**

Open **Infrastructure → Database → Backup**, preview and confirm.

Expected: a new catalog entry contains backup ID, created time, size and checksum; the dump path and secret do not enter Git or documentation.

- [ ] **Step 3: Validate restore into a temporary database**

Select the new backup and run the non-destructive restore validation flow.

Expected: temporary database passes schema, role, ACL, RLS, migration and release-marker checks; production database is not swapped during validation.

- [ ] **Step 4: Verify outbox diagnostics**

Read Pay, Seumei and Hub outbox diagnostics. Stop NATS through Control, perform only an existing safe local demo event, confirm pending age increases, restart NATS, and confirm replay returns pending to zero without duplicate inbox effects.

Expected: PostgreSQL commit succeeds while NATS is down; replay is idempotent after restart.

### Task 6: Close the operational acceptance gate

**Files:**

- Modify: `docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md`
- Modify only if evidence requires: `docs/MATRIZ-DATA-PLATFORM-COCKPIT.md`

**Interfaces:**

- Consumes: evidence from Tasks 1–5.
- Produces: a binary accepted/failed decision and precise blockers for the next plan.

- [ ] **Step 1: Run final scoped verification**

Run:

```powershell
corepack pnpm verify:infrastructure
corepack pnpm prisma:validate
corepack pnpm prisma:migrate:drift
corepack pnpm --filter @matriz/app-matriz-control test
corepack pnpm --filter @matriz/app-matriz-control typecheck
corepack pnpm --filter @matriz/app-matriz-control lint
```

Expected: all commands exit `0`; drift reports clean; no managed artifact is tracked by Git.

- [ ] **Step 2: Perform the final secret and artifact scan**

Run:

```powershell
corepack pnpm verify:tracked-artifacts
rg -n "(?i)(password|secret|token|authorization|postgres(?:ql)?://|nats://|redis://)" docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md
git status --short
```

Expected: tracked-artifact verification passes; acceptance evidence contains no credential value; only intended documentation changes appear in the execution worktree.

- [ ] **Step 3: Mark the evidence result**

Set `Result: ACCEPTED` only when every checkbox is evidenced. Otherwise set `Result: FAILED` and list each failed gate with command, exit code, sanitized symptom, and safe next action.

- [ ] **Step 4: Commit the operational evidence**

```powershell
git add docs/audit/2026-09-01-local-infrastructure-operational-acceptance.md docs/MATRIZ-DATA-PLATFORM-COCKPIT.md
git commit -m "docs: record local infrastructure acceptance"
```

Expected: commit contains documentation only; no dump, log, receipt, vault, `.env`, build output, or cache file.
