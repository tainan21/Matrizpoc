# Neon central topology

This directory owns the reproducible provider topology for the single Matriz
PostgreSQL database. It does not own product migrations or domain models.

The contract creates the logical schemas `core`, `hub`, `spot`, `seumei`,
`contracts`, and `willdash`, plus one migration principal and one runtime
principal per schema. Runtime principals receive only own-schema DML and
sequence access. Public schema creation is revoked. RLS is deliberately handled
by item 17 after tenant-composite integrity exists; product migrations begin in
item 13.

## Safe operation

1. Store `NEON_API_KEY`, `NEON_PROJECT_ID`,
   `NEON_PRIMARY_DATABASE_URL`, `NEON_CI_DATABASE_URL`,
   `NEON_PROVISIONING_BRANCH_ID` and `NEON_DATABASE_OWNER_NAME` in the
   CI/provider secret store. The branch ID
   must be the Neon primary/default branch represented by the provisioning URL;
   the owner must already exist and use a safe PostgreSQL identifier. Never put
   values in Git or command output.
2. Preview with `pnpm neon:topology:dry-run`. This needs no credentials and
   prints identifiers only.
3. Run `pnpm neon:topology:apply` from an authorized protected environment.
   Phase 1 reconciles the primary `matriz` database/endpoint, validates its URL,
   applies and verifies the SQL baseline. Only then phase 2 reconciles
   `matriz-ci` and repeats the baseline through its separate URL.
   If Neon creates a new endpoint but no CI URL/password can be obtained by the
   API, the command stops explicitly. Store the provider-issued
   `NEON_CI_DATABASE_URL` and rerun; all completed operations are idempotent.
4. Run `pnpm neon:topology:verify` in release gates. Missing credentials or
   provider/database failures are fatal. Verify only performs paginated GET
   lookups against Neon and read-only SQL assertions; it never creates a branch,
   database, role, schema or grant.
5. Ask Neon to set/rotate passwords for every LOGIN principal, then store the
   twelve migration/runtime URLs under the names in `.env.example`. The
   provisioning URL is break-glass infrastructure authority and must not be
   available to application runtimes.

The repository cannot prove remote provisioning without an authorized Neon
project and secrets. A successful local dry-run proves only the plan contract.

## Provider/database trust boundary

The Neon API authenticates `NEON_PROJECT_ID`, first reconciles the `matriz`
database on the primary/default branch, then ensures the `matriz-ci` branch and
its own `matriz` database. Database creation uses Neon's required `owner_name`.
A PostgreSQL URL does not cryptographically encode a Neon project ID. The
operator requires `NEON_PROVISIONING_BRANCH_ID` to equal the primary/default
branch returned by Neon, but the protected environment remains responsible for
sourcing both database URLs from their approved endpoints. The CLI compares
each URL hostname with API endpoint metadata and the path with database
`matriz`; it never synthesizes a URL or password. Before apply or verify can
proceed, SQL requires
`current_database() = 'matriz'`; this prevents wrong-database execution but does
not replace provider-level secret provenance. Do not accept this URL from an
application runtime or user-controlled input.
