# Matriz Program — Wave 1 Implementation Plan

## Context

This is the first executable wave of the approved 50-delivery Matriz program. It preserves all seven current apps, adds no shared product domain, keeps Workbench file-backed, and establishes the containment and governance required before database, identity, distributed integration, and offline work.

## Global constraints

- Respect `docs/architectural-laws.md`, `docs/monorepo-structure.md`, `docs/app-communication.md`, and every target app's `AGENTS.md`.
- Never import another app's `src/**` or `app/**` internals.
- Keep strong product domain inside its owning app; add shared packages only after two consumers and a stable domain-free contract exist.
- Workbench remains `.matriz/**`/Git-backed. Its batch importer must use the Workbench repository and atomic file writes, never handwritten canonical JSON.
- The canonical batch has exactly 50 new WorkItems V2 for project `matriz-infra-hub`, preserving the five legacy V1 items.
- All new work items start in `discovery`; acceptance criteria start incomplete; references are context, not completion evidence; creation does not increase scores.
- Roadmap changes create exactly five phases and five initiatives, one per wave, without changing scorecards.
- Root configuration, public contracts, migrations, and architectural laws are serialized.
- New behavior follows test-driven development and scoped verification.

## Task 1: Safe Workbench batch importer (Backlog item 2)

Implement an app-local `BacklogBatchPlan v1` importer with explicit `dry-run`, `apply`, and `resume` modes. Validate schema, expected count, unique logical keys, valid parents, parent and dependency DAGs, resolvable references, semantic/title collisions across active, archived, and V1 items, and partial retry. Apply through the Workbench repository. A repeated apply/resume for the same `batchId + key` must reuse the existing item and create no duplicate. Add focused tests and CLI documentation.

## Task 2: Canonical 50-item program and materialization (Backlog item 3)

Create the canonical `BacklogBatchPlan v1` manifest containing the approved 50 logical items across five waves. Run dry-run, then apply. Create five phases and five initiatives, connect ten items to each initiative, preserve the five legacy V1 items, and verify exactly 55 work items with no semantic duplicates. Re-run resume to prove idempotency. Mark backlog item 2 complete only after this proof; leave the other new items in discovery.

## Task 3: Architecture and governance baseline (Backlog item 4)

Update architectural laws, monorepo map, app communication guidance, Decision Log, and Change Safety. Document seven current apps plus the planned `matriz-identity`, Hub schema ownership, global versus tenant-owned entities, `User` + `TenantMembership` + `AppGrant`, app-local modules and promotion criteria, HTTP/outbox communication, offline editions, and serialized review rules.

## Task 4: Vulnerable dependency containment (Backlog item 5)

Update Next.js to a non-vulnerable patch in the 16.2 line (never below 16.2.11), plus affected MCP SDK, PostCSS, and Sharp dependency paths. Preserve compatibility. Run a production audit and record any residual advisories with explicit severity and ownership; no high/critical advisory may be silently accepted.

## Task 5: CI and validation matrix (Backlog item 6)

Strengthen CI with production audit, Workbench and Sites tests, all Prisma schemas and clients including Spot and WillDash, boundary checks, affected builds, and a clean-working-tree check after generated/validation steps. Align the Node runtime with repository requirements. Keep future app-local test slots explicit without fake passing commands.

## Task 6: Threat model and endpoint inventory (Backlog item 7)

Produce a repository-backed threat model and complete inventory of routes, Server Actions, MCP tools, data classifications, trust boundaries, authentication, CSRF, SSRF, file access, cache behavior, and mutations. Assign owner, exposure, authority source, capability, rate/body limit, and mitigation status.

## Task 7: Hub, MatrizDocs, and MCP containment (Backlog item 8)

Remove public actor/tenant authority from headers and bodies. Derive authority server-side, deny by default, authenticate mutations, cap body and batch sizes, add rate-limit boundaries, and sanitize errors. Add negative authorization tests and preserve app boundaries.

## Task 8: Tenant-safe repositories and queries (Backlog item 9)

Require server-derived tenant scope for every relevant Hub/MatrizDocs read and mutation, including suggestions and ExternalLinks surfaces touched by Wave 1. Add tenant A/B negative tests demonstrating that IDs from another tenant cannot be read or mutated.

## Task 9: Next.js and React security baseline (Backlog item 10)

Add nonce-based CSP and security headers, CSRF/origin checks for mutations, redirect and URL allowlists, private cache responses for sensitive data, server-only separation, and appropriate `error`, `loading`, and `not-found` states in the Wave 1 target surfaces. Add focused security tests without asserting framework internals.

## Task 10: Wave 1 integration gate (Backlog item 1)

Run the complete scoped and global validation matrix, audit the diff against architectural laws, attach evidence to Workbench, update the Wave 1 Outcome only when items 2–10 satisfy their criteria, and leave downstream waves blocked by their declared dependencies rather than implementing placeholders.

## Deferred program

Waves 2–5 remain exactly as approved: central Neon and Identity (11–20), distributed integration (21–30), Seumei desktop/PWA offline (31–40), and product evolution plus institutional hardening (41–50). Their full specifications live in the canonical 50-item batch created by Task 2 and must not be implemented before Wave 1's gate.
