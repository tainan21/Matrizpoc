# Phase 7 — collaboration and cloud roadmap

Phase 7 expands the Workbench without weakening its local-first contract.
Git and `.matriz/**` remain canonical until an explicit architecture decision
replaces that contract.

## 7A — traceable GitHub delivery

Status: **implemented foundation**

- deterministic issue draft and idempotency marker;
- approved Codex + GitHub handoff;
- strict external receipt validation;
- atomic receipt persistence under the selected project;
- revision conflict handling and activity evidence;
- no GitHub token in the Workbench runtime.

Exit evidence:

- a task produces the same draft for the same revision;
- the returned issue URL can be linked and survives reload;
- a stale receipt update returns a conflict;
- an invalid host or non-issue URL is rejected.

## 7B — delivery evidence

Goal: connect an agent run to a branch, commit, pull request and checks.

- [x] add PR, commit and preview receipt schemas;
- [x] derive changed files and checks from the completed Codex run;
- [x] render a delivery timeline on the task;
- [x] never mark a task done from PR state alone;
- [x] require acceptance criteria plus successful checks.

Exit evidence: one request shows run, diff, checks, PR and preview as a single
auditable chain.

## 7C — previews and notifications

Goal: add optional outbound projections.

- [x] Vercel preview receipt, restricted to `*.vercel.app` or one configured
      `WORKBENCH_VERCEL_PREVIEW_HOST`;
- [x] Slack/Teams outbox records for blocking, completion, review and preview
      events;
- [x] per-project opt-in and redaction policy;
- [x] retry/cancel state with channel-scoped idempotency keys;
- [x] provider-neutral dispatcher with atomic delivery transitions, validated
      receipts, sanitized failures and fake-provider proof;
- [x] no provider outage blocks local work;
- [ ] provider delivery adapters and encrypted credentials (7E).

Exit evidence: providers can be disconnected without losing task or activity
state. The current implementation intentionally stops at a durable local
outbox; it does not claim that Slack or Teams delivery occurred.

## 7D — remote collaboration

Goal: support multiple authenticated humans while preserving portability.

Required architecture decisions before implementation:

1. organization and tenant identity model;
2. authentication provider and account recovery;
3. remote database ownership and regional requirements;
4. optimistic concurrency and offline merge policy;
5. audit retention, privacy and deletion policy.

Implementation then adds a remote repository adapter, comments, assignments and
presence. The file adapter remains supported for export, disaster recovery and
single-user offline operation.

Decision gate and recommended boundary:
`docs/ADR-REMOTE-COLLABORATION-BOUNDARY.md`.

Exit evidence: two users can edit different records concurrently, conflicts are
explicit, and a project can be exported back to the complete file protocol.

## 7E — operational hardening

- [x] local runtime, project, queue and delivery counters;
- [x] local provider delivery state machine and failure drill;
- [ ] real provider delivery health (depends on one selected adapter);
- [ ] encrypted secret management (no provider secret is accepted yet);
- [x] bounded audit queries and read-only retention report;
- [ ] privacy deletion and remote retention automation (requires 7D identity);
- [x] documented backup/restore and clean-clone drill;
- [x] local unlock/start rate limits and Codex concurrency cap;
- [x] enforced nonce-based CSP, private cache policy and production browser
      proof;
- [x] Windows production build and browser verification;
- [x] isolated Linux clean-clone workflow with frozen install, scoped gates,
      health and monorepo smoke;
- [ ] first successful Linux workflow execution after the Workbench is
      committed/pushed.

Exit evidence: recovery and provider-failure drills are documented and
repeatable.

## Non-goals

- automatic code execution from the browser;
- silent external writes;
- provider-specific state as the planning authority;
- multi-user behavior emulated with local cookies;
- syncing every remote field bidirectionally.
