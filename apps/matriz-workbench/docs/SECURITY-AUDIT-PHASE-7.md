# Security audit — Phase 7

Date: 2026-07-28  
Scope: `apps/matriz-workbench`  
Stack: Next.js 16, React 19, TypeScript, Node.js filesystem and Codex App
Server over STDIO.

## Executive summary

No critical or high-severity issue remains in the reviewed local-first scope.
The audit fixed parent-process secret inheritance, unexpected API error
disclosure and the loopback cookie transport mismatch.

The strongest current controls are:

- server bound to `127.0.0.1`;
- HTTP-only, `SameSite=Strict` session cookie;
- exact origin validation for mutating Route Handlers;
- runtime Zod validation and bounded files;
- `realpath` boundary and symlink checks;
- atomic writes inside `apps/<app>/.matriz`;
- read-only Codex sandbox, agent network disabled and explicit approvals;
- no raw HTML rendering or generic browser filesystem/shell endpoint;
- minimal child-process environment.
- structural contract tests that fail when a new Route Handler omits local API
  authorization/origin checks or a protected Server Action omits its session
  check.

Remote or multi-user deployment still requires identity-aware abuse controls
at the edge. The local browser surface now enforces a nonce-based CSP.

## Fixed findings

### SEC-001 — parent secrets inherited by Codex

- Rule: NEXT-INJECT-002 / NEXT-SECRETS-002
- Original severity: High
- Location:
  `src/integration/codex/app-server-client.ts:15-50,145`
- Evidence: the App Server previously received `process.env` unchanged.
- Impact: a Codex command or compromised child runtime could observe unrelated
  Workbench/provider credentials.
- Fix: `buildCodexChildEnvironment` now forwards only operating-system paths
  and locale values. Application tokens and provider credentials are excluded.
- Verification: a unit test rejects `WORKBENCH_LOCAL_TOKEN`,
  `OPENAI_API_KEY` and `GITHUB_TOKEN`; a real plugin App Server thread completed
  successfully with the reduced environment.

### SEC-002 — unexpected API error details

- Rule: NEXT-ERROR-001 / NEXT-INPUT-001
- Original severity: Low
- Location: `src/application/http/api-error.ts`
- Evidence: unknown exceptions previously returned `error.message`.
- Impact: implementation or validation details could be exposed to an
  authenticated browser session.
- Fix: Zod failures now return a stable 400 response; unknown errors return a
  generic 500 response. Domain errors remain intentionally actionable.
  Translation now belongs to the application HTTP boundary; the auth module
  owns only session and origin authorization.

### SEC-003 — cookie transport tied to `NODE_ENV`

- Rule: NEXT-SESS-001
- Original severity: Medium (functional security mismatch)
- Location: `app/actions.ts:44-50`
- Evidence: `next start` sets production mode while the V1 product intentionally
  runs over loopback HTTP.
- Impact: `Secure` behavior could differ by browser and make the local session
  unreliable.
- Fix: the local default is non-Secure; HTTPS deployments must explicitly set
  `WORKBENCH_COOKIE_SECURE=true`. HTTP-only and `SameSite=Strict` remain
  mandatory.

### SEC-004 — CSP was not enforced

- Rule: NEXT-CSP-001 / REACT-CSP-001
- Original severity: Medium before remote deployment; Low in the loopback scope
- Location: `proxy.ts`, `src/auth/content-security-policy.ts`
- Evidence: `nosniff`, frame denial, referrer and permissions headers exist,
  but the original configuration had no `Content-Security-Policy` header.
- Impact: a future XSS regression would have less browser-level containment.
- Fix: the Proxy now creates a cryptographic nonce per request, forwards the
  CSP to the Next.js renderer and enforces it on the response. Production
  scripts require the nonce and `strict-dynamic`; `unsafe-eval` exists only in
  development for the local bundler. Frames, objects, media and external
  connections are denied.
- Deliberate exception: `style-src 'unsafe-inline'` remains limited to styles
  because the roadmap and scorecard render bounded React style properties.
- Verification: policy unit tests reject malformed nonces and unsafe
  production script fallbacks; production runtime headers and browser console
  are part of the release gate. The production browser proof returned
  `Cache-Control: no-store`, matched all 21 script nonce properties to the
  response nonce, produced no console errors during unlock/settings navigation
  and blocked a cross-port connection through `connect-src 'self'`.

## Remaining findings

### SEC-005 — distributed rate limiting remains remote-only

- Rule: NEXT-DOS-001
- Severity: Mitigated locally; Medium if exposed beyond loopback
- Location: unlock action and `app/api/codex/**`
- Evidence: unlock accepts 8 attempts per 5 minutes; Codex start accepts 12
  attempts per minute; the run manager permits at most 2 concurrent starts by
  default (configurable from 1 to 4).
- Impact: an untrusted local process can still consume the in-memory budget, and
  counters reset on process restart.
- Current mitigation: loopback binding, exact origin checks, minimum
  16-character token, bounded in-memory buckets and a run concurrency cap.
- Recommendation: use identity-aware distributed limits at the reverse proxy
  and application service before any network exposure. Never treat the local
  in-memory limiter as a multi-instance control.

### SEC-006 — one local identity, no remote authorization model

- Rule: NEXT-AUTH-001
- Severity: Informational for V1; High if reused for multi-user access
- Location: `src/auth/session.ts`, `proxy.ts`
- Evidence: every unlocked browser represents the same local operator.
- Impact: there is no tenant, role, resource-owner or revocation model.
- Current mitigation: this is an explicit single-user, loopback-only product
  boundary.
- Recommendation: do not expose this auth model remotely. Complete the identity,
  tenant, audit and recovery decisions in Phase 7D before adding cloud access.

## Verified negative searches

The scoped audit found no:

- `dangerouslySetInnerHTML`, DOM HTML injection, `eval` or `new Function`;
- browser token storage in `localStorage` or `sessionStorage`;
- wildcard CORS or unsafe `postMessage`;
- user-controlled server-side fetch/SSRF path;
- `shell: true` or request-controlled executable/arguments;
- upload or write into `public/`;
- generic delete, filesystem or shell HTTP API.

## Release gate

Current local V1: acceptable after the fixed findings and passing tests.  
Remote/multi-user Phase 7D: blocked until the remote part of SEC-005 and
SEC-006 are resolved by the remote architecture.

## Phase 7C addendum — external delivery metadata

The PR, preview and notification surfaces preserve the local release boundary:

- PR receipts accept only direct HTTPS pull-request URLs on the configured
  GitHub host;
- preview receipts accept only `*.vercel.app` or the exact configured preview
  host, strip query/fragment data and reject embedded credentials;
- preview commit evidence must match the linked PR commit;
- every mutating route requires the local session and an exact loopback origin;
- integration directories validate project IDs, real paths and symlink
  containment under the selected `.matriz`;
- notification configuration is disabled by default and stores policy, not
  provider credentials;
- the outbox never performs outbound network requests and cannot claim
  `delivered` through its human retry/cancel API;
- notification summaries enforce the selected file-path and external-URL
  disclosure policy before persistence;
- common credential shapes and local home-directory identity are redacted from
  activity queries, UI/MCP reads and notification bodies;
- the canonical append-only JSONL is never silently rewritten by presentation
  redaction.

Provider OAuth/webhook adapters require a separate threat model, encrypted
secret ownership and rate limits before they can be enabled.
