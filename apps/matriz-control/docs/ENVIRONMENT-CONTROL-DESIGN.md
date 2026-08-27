# Environment Control Center — Design

**Status:** approved design, pending implementation plan  
**Date:** 2026-08-25  
**Owner:** `apps/matriz-control`

## Decision

Matriz Control will own a local-first Environment Control Center for auditing,
pulling, and running known Matriz projects with Vercel environment variables.
The first version remains entirely app-local. It does not create a shared
package and does not move product-domain rules out of any app.

The browser will work only with validated project, target, and action IDs. It
will never receive a Vercel token, decrypted value, raw environment map,
arbitrary path, or shell command.

## Why this belongs in Matriz Control

The capability is operational tooling: it coordinates known local projects,
Vercel projects, environment targets, and bounded process actions. This extends
the existing Control responsibility without making Control the owner of product
configuration semantics. Each product continues to consume its own variables;
Control only inventories and delivers them safely.

No shared package is justified because there is only one real consumer. A
shared extraction may be reconsidered only after a second consumer needs the
same stable, domain-neutral contract.

## Current state

The local repository has:

- an ignored root `.env` and a tracked `.env.example`;
- six Prisma schemas with app-specific database variable names;
- no `.vercel/project.json` or `.vercel/repo.json` binding;
- a broken global Vercel CLI installation;
- placeholder Control pages for Workspace, Doctor, and Settings;
- a Control supervisor that already resolves actions server-side;
- a root `.env` whose `VERCEL_TOKEN` is valid, but whose `VERCEL_ORG_ID`
  does not authorize the configured team;
- no analytics keys detected in the accessible local or Vercel inventories.

The authenticated Vercel account exposes one team and ten projects. None of
the projects currently reports a monorepo `rootDirectory`, so project-to-app
association cannot be inferred safely.

## Goals

1. Show a project-by-key matrix for Development, Preview, and Production.
2. Compare required, locally materialized, and remotely configured keys without
   showing values.
3. Let the operator bind a known local app to a known Vercel project.
4. Pull all keys for one target into an explicit ignored destination.
5. Run a declared Control action with a target environment without writing a
   file when possible.
6. Diagnose token, team, connector, CLI, binding, scope, and key drift.
7. Provide direct links and acquisition guidance for every known provider.
8. Scale to additional projects through validated metadata rather than code
   changes scattered across the monorepo.

## Non-goals for V1

- Creating, editing, deleting, or rotating remote Vercel variables.
- Displaying or copying secret values in the browser.
- A generic secret manager or password vault.
- Automatic database migrations or Prisma schema consolidation.
- Automatically deciding which remote project belongs to a local app.
- Sharing this capability through `packages/*`.
- Supporting arbitrary commands, paths, teams, or Vercel accounts.

## User experience

### `/environments`

The new first-class Control route contains:

- a team health summary;
- local-app and Vercel-project binding controls;
- filters for Development, Preview, and Production;
- a matrix of key names and availability;
- status groups for missing, remote-only, local-only, public, sensitive, and
  branch-specific variables;
- safe actions to refresh metadata, pull a target, or run a declared action;
- direct links to the corresponding Vercel settings page.

Secret cells show only status and metadata. They never reveal a value or a
partial value.

### Doctor integration

Doctor reports independent checks instead of one generic Vercel status:

- local credential present;
- token accepted by Vercel;
- configured team accessible;
- connected Vercel app visibility;
- REST API fallback availability;
- CLI installed and executable;
- repository/app project bindings valid;
- destination files ignored by Git;
- required keys present in each target;
- suspicious public prefixes and cross-target database reuse.

### Three target actions

| Target | Default behavior | Optional local file |
| --- | --- | --- |
| Development | Pull for normal local development | `apps/<app>/.env.development.local` |
| Preview | Prefer in-memory execution | `apps/<app>/.env.preview.local` |
| Production | In-memory execution with an explicit warning | `apps/<app>/.env.production.local` |

`.env.preview.local` is a Control-managed snapshot, not a file automatically
loaded by Next.js. Control must inject it only into a declared action.

Pulling replaces the selected managed target file atomically. It never merges
unknown values silently. Before replacement, Control compares key names and
shows the planned additions/removals; values remain server-only.

## Architecture

### Domain

`src/domain/environment-control.ts` defines target names, project bindings,
variable metadata, audit findings, pull requests, and policy decisions. It has
no filesystem, HTTP, React, or Vercel dependencies.

### Application

`src/application/environment-control/` contains use cases:

- inventory local declarations;
- inventory remote metadata;
- bind/unbind a known project;
- audit one app or the ecosystem;
- pull one target to an approved destination;
- resolve a declared process action with an in-memory environment.

Use cases depend on repository/gateway interfaces and return view-neutral
results. A production pull requires an explicit intent flag even though it is
still local-only.

### Integration

`src/integration/environment/` contains:

- `vercel-environment-gateway.ts` for Vercel API operations;
- `environment-file-repository.ts` for allowlisted, atomic local writes;
- `environment-declaration-source.ts` for `.env.example` and code-key
  inventory;
- `environment-project-catalog.ts` for validated app/project bindings;
- `vercel-cli-doctor.ts` for CLI diagnostics only.

The committed catalog stores identifiers, names, directories, target policy,
and dashboard URLs. It never stores tokens or values. V1 starts with remote
projects unassigned because the current Vercel configuration has no reliable
root-directory mapping.

### Presentation

`src/ui/environments/` contains presenters and components. Presenters convert
domain results into labels, counts, severity, and safe actions. Components
consume view models only.

### Server boundary

Route handlers or server actions accept only schemas equivalent to:

```ts
{
  localProjectId: KnownLocalProjectId
  vercelProjectId: KnownVercelProjectId
  target: "development" | "preview" | "production"
  action: "refresh" | "pull" | "run"
  productionIntent?: true
}
```

The server resolves the token, remote project, destination path, and command.
It returns key metadata and audit results, never decrypted values.

## Credential resolution

Control resolves credentials in this order:

1. server process environment;
2. `apps/matriz-control/.env.local` loaded by Next.js;
3. unavailable, with a precise Doctor remediation.

Control does not read credentials from a browser request. The root `.env` may
be used during the one-time migration, but it is not the long-term Control
credential contract.

`VERCEL_TOKEN` must remain local and server-only. It must not be copied into
product deployment environments. `VERCEL_ORG_ID` must match an accessible team
ID. OAuth connector visibility and personal-token visibility are diagnosed
separately because they can legitimately differ.

## Data flow

### Refresh metadata

1. Browser sends a refresh action.
2. Server resolves the local credential and allowlisted team.
3. Gateway lists projects and variables with decryption disabled.
4. Application compares Vercel metadata with declarations and local key names.
5. Presenter returns a value-free matrix.

### Pull a target

1. Browser sends known app, project, target, and pull action IDs.
2. Server validates the committed binding and destination containment.
3. Gateway retrieves the selected target server-side.
4. Repository writes a temporary file inside the approved app directory.
5. Repository verifies Git-ignore coverage and atomically replaces the target.
6. Temporary material is removed and the response returns key names and counts.

### Run without a file

1. Browser sends known project, target, and terminal action IDs.
2. Server resolves the declared command and remote environment.
3. Supervisor creates a child environment from an allowlist plus retrieved
   project variables.
4. Control-only credentials are removed before spawn.
5. Terminal output remains memory-only and secrets are redacted from output.

## Security rules

- Never log response bodies from decrypted environment endpoints.
- Never return values, hashes of values, prefixes, or lengths to the browser.
- Never put `VERCEL_TOKEN`, database URLs, or provider secrets in URLs.
- Keep project/team/action/destination allowlists server-side.
- Reject symlinks and any destination escaping `apps/<known-app>`.
- Require ignored `.local` destinations before writing.
- Use atomic replacement and best-effort owner-only permissions.
- Redact output by matching known key names and retrieved values before storing
  terminal chunks in memory.
- Strip Control credentials from every child process.
- Treat `NEXT_PUBLIC_*` as browser-visible and flag suspicious secret-like
  names, without claiming that every public identifier is a secret.
- Never automatically copy a Production value into Preview or Development.
- Never mutate Vercel state in V1.

## Failure handling

Failures are specific and recoverable:

- invalid token: preserve files and provide the token-settings link;
- inaccessible team: list accessible team identifiers without changing local
  configuration;
- connector/API disagreement: show both statuses and use the configured safe
  fallback;
- unknown binding: block pull/run and open the binding workflow;
- network failure: preserve the previous metadata snapshot in memory only;
- incomplete target: list missing key names and do not launch;
- write failure: keep the previous file and remove the temporary file;
- production request without intent: reject without retrieving values;
- CLI failure: keep API inventory available and provide repair guidance.

## Testing

Unit tests cover:

- target and binding validation;
- metadata diff classification;
- public/sensitive warnings;
- path containment and symlink rejection;
- Git-ignore enforcement;
- atomic replacement and rollback;
- response redaction;
- production intent policy;
- Control-secret stripping from subprocesses.

Integration tests use fake Vercel and filesystem adapters. No test contacts the
real Vercel account or reads the real `.env`.

Scoped validation:

```powershell
corepack pnpm --filter @matriz/app-matriz-control test
corepack pnpm --filter @matriz/app-matriz-control lint
corepack pnpm --filter @matriz/app-matriz-control typecheck
corepack pnpm --filter @matriz/app-matriz-control build
corepack pnpm test:smoke
```

## Incremental delivery

1. Read-only domain, catalog, Vercel metadata gateway, audits, and Doctor.
2. `/environments` matrix and binding workflow.
3. Development pull with atomic ignored-file writes.
4. Preview and Production in-memory execution.
5. Explicit Preview/Production snapshot export.

Remote create/update/delete and credential rotation require a separate design
and confirmation model.

## Boundary risk

Risk is low when all implementation remains in `apps/matriz-control` and reads
other apps only as validated filesystem metadata. The change must not import
another app's `src/**` or `app/**`, alter Prisma schemas, centralize analytics
semantics, or add a shared package.

The manifest changes because `/environments` becomes a public Control route;
therefore the repository smoke tests are required.

## Review triggers

Revisit this decision when:

- a second real consumer needs the same environment-control contract;
- Vercel project root directories become authoritative for every app;
- remote mutation or rotation enters scope;
- a dedicated secret manager replaces Vercel as the source of truth;
- multi-user or remote Control operation is introduced.
