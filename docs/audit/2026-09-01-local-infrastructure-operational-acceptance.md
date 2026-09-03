# Matriz Local Infrastructure Operational Acceptance

**Date:** 2026-09-01  
**Host:** Windows x64  
**Result:** IN PROGRESS

## Protected external baseline

- Observed at: `2026-09-01T12:59:01.6363341Z`
- PostgreSQL 5432 service: `postgresql-x64-17`
- Status and start mode: `Running` / `Auto`
- Service process ID: `5580`
- Listener process ID: `8916`
- Listener addresses: `0.0.0.0:5432` and `[::]:5432`
- Executable image fingerprint: `C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe`
- Data root fingerprint: `C:\Program Files\PostgreSQL\17\data`
- PostgreSQL client: `17.4`

The service and database above are external to Matriz ownership and must remain
unchanged throughout acceptance.

## Managed stack

| Service | Expected endpoint | Install | Health | Ownership |
| --- | --- | --- | --- | --- |
| MatrizPostgres17 | 127.0.0.1:55432 | pending | pending | pending |
| MatrizGarnet | 127.0.0.1:46379 | pending | pending | pending |
| MatrizNats | 127.0.0.1:54222 / 58222 | pending | pending | pending |

Pre-install state: no managed service was registered, no managed port was
listening, and `C:\ProgramData\Matriz\Infrastructure` did not exist.

## Gates

- [ ] External 5432 unchanged
- [ ] Installation receipt valid
- [ ] Managed services healthy
- [ ] Migrations clean
- [ ] Seed and Identity healthy
- [ ] Backup and temporary restore valid
- [ ] Garnet authentication valid
- [ ] NATS JetStream and scoped credentials valid

## Preflight

- Prisma clients generated for all eight schemas: PASS.
- Prisma schemas validated with process-local non-production placeholders: PASS.
- Infrastructure contract inventory (`17 apps`, `8 schemas`): PASS.
- Focused Matriz Control infrastructure contracts: `22/22` PASS.
- Matriz Control desktop TypeScript compilation: PASS.
- Monorepo smoke baseline: `403/403` PASS.
- Seumei baseline: `335/335` PASS.

The first Prisma validation attempt failed closed because the isolated worktree
did not inherit database URL variables. Validation was repeated with loopback,
process-only placeholders; Prisma validation does not connect to those URLs.
No environment file was created.

## Operational evidence

Pending.

## Blockers and follow-up

None observed during baseline capture.
