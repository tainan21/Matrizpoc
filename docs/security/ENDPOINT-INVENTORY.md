# Endpoint inventory — current POC

This is a current-source inventory, not a claim that edge, Vercel, CDN, WAF,
or cloud controls exist. `docs/security/THREAT-MODEL.md` supplies the current
and target threat analysis. Stable IDs below are drift-checked by
`tests/smoke/security-endpoint-inventory.test.ts` against tracked source only.
The test deliberately excludes page components, helper functions, resources,
and transports that do not declare an HTTP method, exported Server Action, or
MCP tool. A method+route is one entry; MCP aliases are separate named tools but
their common implementation is not double-counted as an invocation.

## Reading key

`R` = read, `M` = mutation. Source anchors are `path:line` in the current
checkout. Profile gives input/effect, data classification, current authn/authz,
CSRF/origin, cache, validation/limit/error posture, risk, and remediation.

| Profile | Current evidence and approved follow-up |
| --- | --- |
| `H-R` | Hub/MatrizDocs read; opaque server-owned mock/dev session derives actor/tenant, headers do not grant authority. **Item 9** fixes tenant-unsafe queries; **item 17** establishes roles/grants/RLS. |
| `H-M` | Hub/MatrizDocs mutation; server actor, explicit cross-origin rejection, bounded ordinary bodies and private/sanitized error response. **Item 9** fixes tenant-unsafe queries; **item 17** adds grants/RLS. |
| `H-MOCK` | Mock-auth browser transport; opaque HttpOnly server-resolved cookie and localhost credential CORS allowlist, not production identity. **Item 17** replaces it with identity/grants. |
| `H-CACHE` | Shared cache; Hub session guards reads/writes and binds `updatedBy` to its server session. Cache keys remain non-tenant-prefixed until **items 9/17**. |
| `WB-R` | Workbench local-loopback read. This inventory is **item 7**; no separate canonical remediation is assigned. |
| `WB-M` | Workbench local mutation. This inventory is **item 7**; retain local trust review before networking it. |
| `WB-A` | Server Action guarded by `requireWorkbenchSession` at `apps/matriz-workbench/app/actions.ts:151`. This inventory is **item 7**. |
| `WB-MCP-R` | Workbench STDIO read tool; no HTTP origin/cookie; local process trust required. This inventory is **item 7**. |
| `WB-MCP-M` | Workbench STDIO write tool; bounded Zod input/documented approval, but the process caller is authority. This inventory is **item 7**. |
| `H-MCP-R` | Hub/MatrizDocs MCP operational reads require a server-built principal; only `initialize`, `ping`, and `tools/list` are public advertisement. **Item 9** fixes predicates and **item 17** supplies grants/RLS. |
| `H-MCP-M` | Hub/MatrizDocs MCP mutation requires the same server-built principal, capped request/batch and principal rate limit. **Items 9/17** remain for predicates/grants/RLS. |
| `APP-R` | App-local read or preflight handler; authentication and authorization remain owned by the app. |
| `APP-M` | App-local mutation handler; authorization, validation and side effects remain owned by the app. |

`Item 7` is this completed inventory/threat-model work, not a remediation.
`Item 10` is the Next/React dependency baseline and is tracked in the threat
model, not as an endpoint profile. The closed global whitelist remains User,
authentication credentials/challenges, OIDC clients and institutional catalog;
tenant-owned operational records, including ExternalLinks, follow **items 9 and 17**.

## HTTP Route Handlers — 142 entries

| ID | Source | Function/tool | Effect | Profile |
| --- | --- | --- | --- | --- |
| `HTTP:contracts:GET:/api/health` | `apps/contracts/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:health:GET:/api/health` | `apps/health/app/api/health/route.ts:1` | `GET` | R | `APP-R` |
| `HTTP:matriz-admin:GET:/api/health` | `apps/matriz-admin/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:matriz-control:DELETE:/api/terminal/sessions/[sessionId]` | `apps/matriz-control/app/api/terminal/sessions/[sessionId]/route.ts:6` | `DELETE` | M | `APP-M` |
| `HTTP:matriz-control:GET:/api/doctor` | `apps/matriz-control/app/api/doctor/route.ts:4` | `GET` | R | `APP-R` |
| `HTTP:matriz-control:GET:/api/health` | `apps/matriz-control/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:matriz-control:GET:/api/projects` | `apps/matriz-control/app/api/projects/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:matriz-control:GET:/api/terminal/sessions` | `apps/matriz-control/app/api/terminal/sessions/route.ts:6` | `GET` | R | `APP-R` |
| `HTTP:matriz-control:GET:/api/terminal/sessions/[sessionId]` | `apps/matriz-control/app/api/terminal/sessions/[sessionId]/route.ts:4` | `GET` | R | `APP-R` |
| `HTTP:matriz-control:PATCH:/api/terminal/sessions/[sessionId]` | `apps/matriz-control/app/api/terminal/sessions/[sessionId]/route.ts:5` | `PATCH` | M | `APP-M` |
| `HTTP:matriz-control:POST:/api/doctor/cleanup` | `apps/matriz-control/app/api/doctor/cleanup/route.ts:3` | `POST` | M | `APP-M` |
| `HTTP:matriz-control:POST:/api/startup` | `apps/matriz-control/app/api/startup/route.ts:9` | `POST` | M | `APP-M` |
| `HTTP:matriz-control:POST:/api/terminal/sessions` | `apps/matriz-control/app/api/terminal/sessions/route.ts:7` | `POST` | M | `APP-M` |
| `HTTP:matriz-control:POST:/api/terminal/sessions/[sessionId]/input` | `apps/matriz-control/app/api/terminal/sessions/[sessionId]/input/route.ts:4` | `POST` | M | `APP-M` |
| `HTTP:matriz-control:POST:/api/terminal/sessions/[sessionId]/restart` | `apps/matriz-control/app/api/terminal/sessions/[sessionId]/restart/route.ts:4` | `POST` | M | `APP-M` |
| `HTTP:matriz-hub:DELETE:/api/auth/mock/session` | `apps/matriz-hub/app/api/auth/mock/session/route.ts:26` | `DELETE` | M | `H-MOCK` |
| `HTTP:matriz-hub:GET:/api/auth/mock/session` | `apps/matriz-hub/app/api/auth/mock/session/route.ts:9` | `GET` | R | `H-MOCK` |
| `HTTP:matriz-hub:GET:/api/capabilities/appearance` | `apps/matriz-hub/app/api/capabilities/appearance/route.ts:15` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/capabilities/praticies` | `apps/matriz-hub/app/api/capabilities/praticies/route.ts:8` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/capabilities/themes` | `apps/matriz-hub/app/api/capabilities/themes/route.ts:8` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/docs/context-packages` | `apps/matriz-hub/app/api/docs/context-packages/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/documents` | `apps/matriz-hub/app/api/docs/documents/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/documents/[docId]` | `apps/matriz-hub/app/api/docs/documents/[docId]/route.ts:13` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/entities` | `apps/matriz-hub/app/api/docs/entities/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/exports` | `apps/matriz-hub/app/api/docs/exports/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/governance` | `apps/matriz-hub/app/api/docs/governance/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/mcp` | `apps/matriz-hub/app/api/docs/mcp/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/relations` | `apps/matriz-hub/app/api/docs/relations/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/runs` | `apps/matriz-hub/app/api/docs/runs/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/suggestions` | `apps/matriz-hub/app/api/docs/suggestions/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/tasks` | `apps/matriz-hub/app/api/docs/tasks/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/docs/timeline` | `apps/matriz-hub/app/api/docs/timeline/route.ts:9` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/ecosystem/cache` | `apps/matriz-hub/app/api/ecosystem/cache/route.ts:27` | `GET` | R | `H-CACHE` |
| `HTTP:matriz-hub:GET:/api/ecosystem/health` | `apps/matriz-hub/app/api/ecosystem/health/route.ts:6` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/events` | `apps/matriz-hub/app/api/events/route.ts:7` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/external-links` | `apps/matriz-hub/app/api/external-links/route.ts:7` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/feature-flags` | `apps/matriz-hub/app/api/feature-flags/route.ts:7` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/health` | `apps/matriz-hub/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/mcp` | `apps/matriz-hub/app/api/mcp/route.ts:16` | `GET` | R | `H-MCP-R` |
| `HTTP:matriz-hub:GET:/api/onboarding-status` | `apps/matriz-hub/app/api/onboarding-status/route.ts:8` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/praticies/patterns/[format]` | `apps/matriz-hub/app/api/praticies/patterns/[format]/route.ts:17` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/registry` | `apps/matriz-hub/app/api/registry/route.ts:6` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/telemetry` | `apps/matriz-hub/app/api/telemetry/route.ts:6` | `GET` | R | `H-R` |
| `HTTP:matriz-hub:GET:/api/v1/capabilities/appearance` | `apps/matriz-hub/app/api/v1/capabilities/appearance/route.ts:1` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/v1/capabilities/praticies` | `apps/matriz-hub/app/api/v1/capabilities/praticies/route.ts:1` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:GET:/api/v1/capabilities/themes` | `apps/matriz-hub/app/api/v1/capabilities/themes/route.ts:1` | `GET` | R | `APP-R` |
| `HTTP:matriz-hub:OPTIONS:/api/auth/mock/challenge` | `apps/matriz-hub/app/api/auth/mock/challenge/route.ts:6` | `OPTIONS` | R | `H-MOCK` |
| `HTTP:matriz-hub:OPTIONS:/api/auth/mock/email` | `apps/matriz-hub/app/api/auth/mock/email/route.ts:6` | `OPTIONS` | R | `H-MOCK` |
| `HTTP:matriz-hub:OPTIONS:/api/auth/mock/google` | `apps/matriz-hub/app/api/auth/mock/google/route.ts:6` | `OPTIONS` | R | `H-MOCK` |
| `HTTP:matriz-hub:OPTIONS:/api/auth/mock/session` | `apps/matriz-hub/app/api/auth/mock/session/route.ts:8` | `OPTIONS` | R | `H-MOCK` |
| `HTTP:matriz-hub:OPTIONS:/api/auth/mock/verify` | `apps/matriz-hub/app/api/auth/mock/verify/route.ts:6` | `OPTIONS` | R | `H-MOCK` |
| `HTTP:matriz-hub:OPTIONS:/api/capabilities/appearance` | `apps/matriz-hub/app/api/capabilities/appearance/route.ts:12` | `OPTIONS` | R | `APP-R` |
| `HTTP:matriz-hub:OPTIONS:/api/capabilities/praticies` | `apps/matriz-hub/app/api/capabilities/praticies/route.ts:7` | `OPTIONS` | R | `APP-R` |
| `HTTP:matriz-hub:OPTIONS:/api/ecosystem/cache` | `apps/matriz-hub/app/api/ecosystem/cache/route.ts:20` | `OPTIONS` | R | `H-CACHE` |
| `HTTP:matriz-hub:OPTIONS:/api/v1/capabilities/appearance` | `apps/matriz-hub/app/api/v1/capabilities/appearance/route.ts:1` | `OPTIONS` | R | `APP-R` |
| `HTTP:matriz-hub:OPTIONS:/api/v1/capabilities/praticies` | `apps/matriz-hub/app/api/v1/capabilities/praticies/route.ts:1` | `OPTIONS` | R | `APP-R` |
| `HTTP:matriz-hub:PATCH:/api/docs/documents/[docId]` | `apps/matriz-hub/app/api/docs/documents/[docId]/route.ts:25` | `PATCH` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/auth/mock/challenge` | `apps/matriz-hub/app/api/auth/mock/challenge/route.ts:7` | `POST` | M | `H-MOCK` |
| `HTTP:matriz-hub:POST:/api/auth/mock/email` | `apps/matriz-hub/app/api/auth/mock/email/route.ts:7` | `POST` | M | `H-MOCK` |
| `HTTP:matriz-hub:POST:/api/auth/mock/google` | `apps/matriz-hub/app/api/auth/mock/google/route.ts:7` | `POST` | M | `H-MOCK` |
| `HTTP:matriz-hub:POST:/api/auth/mock/session` | `apps/matriz-hub/app/api/auth/mock/session/route.ts:18` | `POST` | M | `H-MOCK` |
| `HTTP:matriz-hub:POST:/api/auth/mock/verify` | `apps/matriz-hub/app/api/auth/mock/verify/route.ts:7` | `POST` | M | `H-MOCK` |
| `HTTP:matriz-hub:POST:/api/capabilities/themes/checkout` | `apps/matriz-hub/app/api/capabilities/themes/checkout/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:matriz-hub:POST:/api/docs/context-packages` | `apps/matriz-hub/app/api/docs/context-packages/route.ts:19` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/context-packages/[id]/publish` | `apps/matriz-hub/app/api/docs/context-packages/[id]/publish/route.ts:13` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/conversions` | `apps/matriz-hub/app/api/docs/conversions/route.ts:9` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/documents` | `apps/matriz-hub/app/api/docs/documents/route.ts:25` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/documents/[docId]` | `apps/matriz-hub/app/api/docs/documents/[docId]/route.ts:42` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/documents/[docId]/versions` | `apps/matriz-hub/app/api/docs/documents/[docId]/versions/route.ts:13` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/entities` | `apps/matriz-hub/app/api/docs/entities/route.ts:19` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/exports` | `apps/matriz-hub/app/api/docs/exports/route.ts:19` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/imports` | `apps/matriz-hub/app/api/docs/imports/route.ts:9` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/relations` | `apps/matriz-hub/app/api/docs/relations/route.ts:19` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/suggestions` | `apps/matriz-hub/app/api/docs/suggestions/route.ts:20` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/suggestions/[id]/accept` | `apps/matriz-hub/app/api/docs/suggestions/[id]/accept/route.ts:13` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/docs/suggestions/[id]/reject` | `apps/matriz-hub/app/api/docs/suggestions/[id]/reject/route.ts:13` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/institutional/refresh` | `apps/matriz-hub/app/api/institutional/refresh/route.ts:22` | `POST` | M | `H-M` |
| `HTTP:matriz-hub:POST:/api/mcp` | `apps/matriz-hub/app/api/mcp/route.ts:34` | `POST` | M | `H-MCP-M` |
| `HTTP:matriz-hub:POST:/api/v1/capabilities/themes/checkout` | `apps/matriz-hub/app/api/v1/capabilities/themes/checkout/route.ts:1` | `POST` | M | `APP-M` |
| `HTTP:matriz-hub:PUT:/api/capabilities/appearance` | `apps/matriz-hub/app/api/capabilities/appearance/route.ts:21` | `PUT` | M | `APP-M` |
| `HTTP:matriz-hub:PUT:/api/capabilities/praticies` | `apps/matriz-hub/app/api/capabilities/praticies/route.ts:12` | `PUT` | M | `APP-M` |
| `HTTP:matriz-hub:PUT:/api/ecosystem/cache` | `apps/matriz-hub/app/api/ecosystem/cache/route.ts:39` | `PUT` | M | `H-CACHE` |
| `HTTP:matriz-hub:PUT:/api/v1/capabilities/appearance` | `apps/matriz-hub/app/api/v1/capabilities/appearance/route.ts:1` | `PUT` | M | `APP-M` |
| `HTTP:matriz-hub:PUT:/api/v1/capabilities/praticies` | `apps/matriz-hub/app/api/v1/capabilities/praticies/route.ts:1` | `PUT` | M | `APP-M` |
| `HTTP:matriz-workbench:GET:/api/codex/projects/[projectId]/requests/[requestId]/events` | `apps/matriz-workbench/app/api/codex/projects/[projectId]/requests/[requestId]/events/route.ts:13` | `GET` | R | `WB-R` |
| `HTTP:matriz-workbench:GET:/api/codex/runtime` | `apps/matriz-workbench/app/api/codex/runtime/route.ts:9` | `GET` | R | `WB-R` |
| `HTTP:matriz-workbench:GET:/api/health` | `apps/matriz-workbench/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:matriz-workbench:POST:/api/codex/projects/[projectId]/requests/[requestId]/approvals/[approvalId]` | `apps/matriz-workbench/app/api/codex/projects/[projectId]/requests/[requestId]/approvals/[approvalId]/route.ts:14` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/codex/projects/[projectId]/requests/[requestId]/cancel` | `apps/matriz-workbench/app/api/codex/projects/[projectId]/requests/[requestId]/cancel/route.ts:9` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/codex/projects/[projectId]/requests/[requestId]/start` | `apps/matriz-workbench/app/api/codex/projects/[projectId]/requests/[requestId]/start/route.ts:13` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/collaboration/projects/[projectId]/github/issues/[taskId]` | `apps/matriz-workbench/app/api/collaboration/projects/[projectId]/github/issues/[taskId]/route.ts:18` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/collaboration/projects/[projectId]/github/pull-requests/[requestId]` | `apps/matriz-workbench/app/api/collaboration/projects/[projectId]/github/pull-requests/[requestId]/route.ts:20` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/collaboration/projects/[projectId]/notifications/config` | `apps/matriz-workbench/app/api/collaboration/projects/[projectId]/notifications/config/route.ts:24` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/collaboration/projects/[projectId]/notifications/outbox/[notificationId]` | `apps/matriz-workbench/app/api/collaboration/projects/[projectId]/notifications/outbox/[notificationId]/route.ts:16` | `POST` | M | `WB-M` |
| `HTTP:matriz-workbench:POST:/api/collaboration/projects/[projectId]/vercel/previews/[requestId]` | `apps/matriz-workbench/app/api/collaboration/projects/[projectId]/vercel/previews/[requestId]/route.ts:22` | `POST` | M | `WB-M` |
| `HTTP:matrizlib:GET:/api/health` | `apps/matrizlib/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:seumei:GET:/api/health` | `apps/seumei/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:DELETE:/api/members/[membershipId]` | `apps/seumeiapp/app/api/members/[membershipId]/route.ts:21` | `DELETE` | M | `APP-M` |
| `HTTP:seumeiapp:DELETE:/api/members/invitations/[invitationId]` | `apps/seumeiapp/app/api/members/invitations/[invitationId]/route.ts:6` | `DELETE` | M | `APP-M` |
| `HTTP:seumeiapp:GET:/api/catalog/products` | `apps/seumeiapp/app/api/catalog/products/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/companies` | `apps/seumeiapp/app/api/companies/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/customers` | `apps/seumeiapp/app/api/customers/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/customers/[customerId]` | `apps/seumeiapp/app/api/customers/[customerId]/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/finance/entries` | `apps/seumeiapp/app/api/finance/entries/route.ts:6` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/finance/entries/[entryId]` | `apps/seumeiapp/app/api/finance/entries/[entryId]/route.ts:6` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/health` | `apps/seumeiapp/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/ingredients` | `apps/seumeiapp/app/api/ingredients/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/members` | `apps/seumeiapp/app/api/members/route.ts:6` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/onboarding` | `apps/seumeiapp/app/api/onboarding/route.ts:14` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/orders` | `apps/seumeiapp/app/api/orders/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/orders/[orderId]` | `apps/seumeiapp/app/api/orders/[orderId]/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/public/v1/portfolio` | `apps/seumeiapp/app/api/public/v1/portfolio/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/public/v1/stores/[storeSlug]` | `apps/seumeiapp/app/api/public/v1/stores/[storeSlug]/route.ts:4` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/recipes/[productId]` | `apps/seumeiapp/app/api/recipes/[productId]/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/stock` | `apps/seumeiapp/app/api/stock/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/stock/[ingredientId]/movements` | `apps/seumeiapp/app/api/stock/[ingredientId]/movements/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/api/store/design` | `apps/seumeiapp/app/api/store/design/route.ts:5` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:GET:/enter/[companyId]` | `apps/seumeiapp/app/enter/[companyId]/route.ts:6` | `GET` | R | `APP-R` |
| `HTTP:seumeiapp:PATCH:/api/catalog/products/[productId]` | `apps/seumeiapp/app/api/catalog/products/[productId]/route.ts:5` | `PATCH` | M | `APP-M` |
| `HTTP:seumeiapp:PATCH:/api/members/[membershipId]` | `apps/seumeiapp/app/api/members/[membershipId]/route.ts:9` | `PATCH` | M | `APP-M` |
| `HTTP:seumeiapp:PATCH:/api/onboarding` | `apps/seumeiapp/app/api/onboarding/route.ts:18` | `PATCH` | M | `APP-M` |
| `HTTP:seumeiapp:PATCH:/api/orders/[orderId]` | `apps/seumeiapp/app/api/orders/[orderId]/route.ts:6` | `PATCH` | M | `APP-M` |
| `HTTP:seumeiapp:PATCH:/api/recipes/[productId]` | `apps/seumeiapp/app/api/recipes/[productId]/route.ts:6` | `PATCH` | M | `APP-M` |
| `HTTP:seumeiapp:PATCH:/api/store/design` | `apps/seumeiapp/app/api/store/design/route.ts:6` | `PATCH` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/catalog/categories` | `apps/seumeiapp/app/api/catalog/categories/route.ts:5` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/catalog/products` | `apps/seumeiapp/app/api/catalog/products/route.ts:9` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/companies` | `apps/seumeiapp/app/api/companies/route.ts:9` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/company-selection` | `apps/seumeiapp/app/api/company-selection/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/finance/entries` | `apps/seumeiapp/app/api/finance/entries/route.ts:12` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/finance/entries/[entryId]/cancel` | `apps/seumeiapp/app/api/finance/entries/[entryId]/cancel/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/finance/entries/[entryId]/pay` | `apps/seumeiapp/app/api/finance/entries/[entryId]/pay/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/ingredients` | `apps/seumeiapp/app/api/ingredients/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/invitations/accept` | `apps/seumeiapp/app/api/invitations/accept/route.ts:9` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/members/invitations` | `apps/seumeiapp/app/api/members/invitations/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/onboarding` | `apps/seumeiapp/app/api/onboarding/route.ts:23` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/public/v1/stores/[storeSlug]/checkout` | `apps/seumeiapp/app/api/public/v1/stores/[storeSlug]/checkout/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/stock/[ingredientId]/movements` | `apps/seumeiapp/app/api/stock/[ingredientId]/movements/route.ts:6` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/store/design/publish` | `apps/seumeiapp/app/api/store/design/publish/route.ts:5` | `POST` | M | `APP-M` |
| `HTTP:seumeiapp:POST:/api/store/design/unpublish` | `apps/seumeiapp/app/api/store/design/unpublish/route.ts:5` | `POST` | M | `APP-M` |
| `HTTP:sites:GET:/api/health` | `apps/sites/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:spot:GET:/api/health` | `apps/spot/app/api/health/route.ts:3` | `GET` | R | `APP-R` |
| `HTTP:willdash:GET:/api/health` | `apps/willdash/app/api/health/route.ts:3` | `GET` | R | `APP-R` |

## Workbench Server Actions — 44 entries

| ID | Source | Function/tool | Effect | Profile |
| --- | --- | --- | --- | --- |
| `ACTION:matriz-control:unlockAction` | `apps/matriz-control/app/actions.ts:7` | `unlockAction` | M | `WB-A` |
| `ACTION:matriz-hub:generatePatternsAction` | `apps/matriz-hub/app/praticies/actions.ts:17` | `generatePatternsAction` | M | `WB-A` |
| `ACTION:matriz-hub:runHealthCheckAction` | `apps/matriz-hub/app/health/checks/actions.ts:14` | `runHealthCheckAction` | M | `WB-A` |
| `ACTION:matriz-workbench:acceptInboxItemAction` | `apps/matriz-workbench/app/actions.ts:918` | `acceptInboxItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addBacklogReferenceAction` | `apps/matriz-workbench/app/actions.ts:429` | `addBacklogReferenceAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addRoadmapInitiativeAction` | `apps/matriz-workbench/app/actions.ts:519` | `addRoadmapInitiativeAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addRoadmapMarkerAction` | `apps/matriz-workbench/app/actions.ts:610` | `addRoadmapMarkerAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addRoadmapPhaseAction` | `apps/matriz-workbench/app/actions.ts:491` | `addRoadmapPhaseAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addSprintDependencyAction` | `apps/matriz-workbench/app/actions.ts:1087` | `addSprintDependencyAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addSprintOutcomeAction` | `apps/matriz-workbench/app/actions.ts:1029` | `addSprintOutcomeAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addSprintWorkAction` | `apps/matriz-workbench/app/actions.ts:1064` | `addSprintWorkAction` | M | `WB-A` |
| `ACTION:matriz-workbench:addWorkItemReferenceAction` | `apps/matriz-workbench/app/actions.ts:338` | `addWorkItemReferenceAction` | M | `WB-A` |
| `ACTION:matriz-workbench:advanceRoadmapInitiativeAction` | `apps/matriz-workbench/app/actions.ts:690` | `advanceRoadmapInitiativeAction` | M | `WB-A` |
| `ACTION:matriz-workbench:archiveBacklogItemAction` | `apps/matriz-workbench/app/actions.ts:476` | `archiveBacklogItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:bulkWorkItemsAction` | `apps/matriz-workbench/app/actions.ts:962` | `bulkWorkItemsAction` | M | `WB-A` |
| `ACTION:matriz-workbench:captureInboxItemAction` | `apps/matriz-workbench/app/actions.ts:884` | `captureInboxItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:closeSprintAction` | `apps/matriz-workbench/app/actions.ts:1126` | `closeSprintAction` | M | `WB-A` |
| `ACTION:matriz-workbench:createAgentRequestAction` | `apps/matriz-workbench/app/actions.ts:823` | `createAgentRequestAction` | M | `WB-A` |
| `ACTION:matriz-workbench:createBacklogItemAction` | `apps/matriz-workbench/app/actions.ts:368` | `createBacklogItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:createControlSnippetAction` | `apps/matriz-workbench/app/actions.ts:1200` | `createControlSnippetAction` | M | `WB-A` |
| `ACTION:matriz-workbench:createProjectBlueprintAction` | `apps/matriz-workbench/app/actions.ts:186` | `createProjectBlueprintAction` | M | `WB-A` |
| `ACTION:matriz-workbench:createSprintAction` | `apps/matriz-workbench/app/actions.ts:945` | `createSprintAction` | M | `WB-A` |
| `ACTION:matriz-workbench:createWorkItemAction` | `apps/matriz-workbench/app/actions.ts:218` | `createWorkItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:decideSprintOutcomeAction` | `apps/matriz-workbench/app/actions.ts:1108` | `decideSprintOutcomeAction` | M | `WB-A` |
| `ACTION:matriz-workbench:discardInboxItemAction` | `apps/matriz-workbench/app/actions.ts:933` | `discardInboxItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:initializeProjectAction` | `apps/matriz-workbench/app/actions.ts:177` | `initializeProjectAction` | M | `WB-A` |
| `ACTION:matriz-workbench:initializeRoadmapScorecardAction` | `apps/matriz-workbench/app/actions.ts:726` | `initializeRoadmapScorecardAction` | M | `WB-A` |
| `ACTION:matriz-workbench:initializeRoadmapScorecardsAction` | `apps/matriz-workbench/app/actions.ts:775` | `initializeRoadmapScorecardsAction` | M | `WB-A` |
| `ACTION:matriz-workbench:lockAction` | `apps/matriz-workbench/app/actions.ts:171` | `lockAction` | M | `WB-A` |
| `ACTION:matriz-workbench:moveWorkItemAction` | `apps/matriz-workbench/app/actions.ts:316` | `moveWorkItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:reconcileRoadmapScoreAction` | `apps/matriz-workbench/app/actions.ts:757` | `reconcileRoadmapScoreAction` | M | `WB-A` |
| `ACTION:matriz-workbench:reviewAgentExecutionAction` | `apps/matriz-workbench/app/actions.ts:836` | `reviewAgentExecutionAction` | M | `WB-A` |
| `ACTION:matriz-workbench:reviewControlEvidenceAction` | `apps/matriz-workbench/app/actions.ts:1188` | `reviewControlEvidenceAction` | M | `WB-A` |
| `ACTION:matriz-workbench:saveRoadmapInitiativeAction` | `apps/matriz-workbench/app/actions.ts:564` | `saveRoadmapInitiativeAction` | M | `WB-A` |
| `ACTION:matriz-workbench:saveRoadmapMarkerAction` | `apps/matriz-workbench/app/actions.ts:640` | `saveRoadmapMarkerAction` | M | `WB-A` |
| `ACTION:matriz-workbench:saveSprintAction` | `apps/matriz-workbench/app/actions.ts:1009` | `saveSprintAction` | M | `WB-A` |
| `ACTION:matriz-workbench:saveWorkItemAction` | `apps/matriz-workbench/app/actions.ts:248` | `saveWorkItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:toggleCriterionAction` | `apps/matriz-workbench/app/actions.ts:454` | `toggleCriterionAction` | M | `WB-A` |
| `ACTION:matriz-workbench:toggleRoadmapGoalAction` | `apps/matriz-workbench/app/actions.ts:740` | `toggleRoadmapGoalAction` | M | `WB-A` |
| `ACTION:matriz-workbench:toggleRoadmapScorecardGoalAction` | `apps/matriz-workbench/app/actions.ts:795` | `toggleRoadmapScorecardGoalAction` | M | `WB-A` |
| `ACTION:matriz-workbench:triageInboxItemAction` | `apps/matriz-workbench/app/actions.ts:898` | `triageInboxItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:unlockAction` | `apps/matriz-workbench/app/actions.ts:155` | `unlockAction` | M | `WB-A` |
| `ACTION:matriz-workbench:updateBacklogItemAction` | `apps/matriz-workbench/app/actions.ts:390` | `updateBacklogItemAction` | M | `WB-A` |
| `ACTION:matriz-workbench:writeDocumentAction` | `apps/matriz-workbench/app/actions.ts:1168` | `writeDocumentAction` | M | `WB-A` |

## MCP tools — 51 entries

| ID | Source | Function/tool | Effect | Profile |
| --- | --- | --- | --- | --- |
| `MCP:matriz-hub:convert_document` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:72` | `convert_document` | M | `H-MCP-M` |
| `MCP:matriz-hub:create_doc_suggestion` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:46` | `create_doc_suggestion` | M | `H-MCP-M` |
| `MCP:matriz-hub:generate_context_package` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:82` | `generate_context_package` | M | `H-MCP-M` |
| `MCP:matriz-hub:list_context_packages` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:31` | `list_context_packages` | R | `H-MCP-R` |
| `MCP:matriz-hub:propose_governance_review_from_doc` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:106` | `propose_governance_review_from_doc` | M | `H-MCP-M` |
| `MCP:matriz-hub:propose_task_from_doc` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:96` | `propose_task_from_doc` | M | `H-MCP-M` |
| `MCP:matriz-hub:read_context_package` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:36` | `read_context_package` | R | `H-MCP-R` |
| `MCP:matriz-hub:read_doc` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:21` | `read_doc` | R | `H-MCP-R` |
| `MCP:matriz-hub:refresh_doc_index` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:62` | `refresh_doc_index` | M | `H-MCP-M` |
| `MCP:matriz-hub:refresh_project_ingestion` | `apps/matriz-hub/src/mcp/tools.ts:29` | `refresh_project_ingestion` | M | `H-MCP-M` |
| `MCP:matriz-hub:search_docs` | `apps/matriz-hub/src/domains/docs/mcp/tools.ts:11` | `search_docs` | R | `H-MCP-R` |
| `MCP:matriz-workbench:workbench_append_activity` | `apps/matriz-workbench/src/mcp/server.ts:479` | `workbench_append_activity` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_check_ownership_conflicts` | `apps/matriz-workbench/src/mcp/server.ts:235` | `workbench_check_ownership_conflicts` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_checkpoint_execution_attempt` | `apps/matriz-workbench/src/mcp/server.ts:518` | `workbench_checkpoint_execution_attempt` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_claim_agent_request` | `apps/matriz-workbench/src/mcp/server.ts:497` | `workbench_claim_agent_request` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_complete_agent_request` | `apps/matriz-workbench/src/mcp/server.ts:548` | `workbench_complete_agent_request` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_create_backlog_item` | `apps/matriz-workbench/src/mcp/server.ts:407` | `workbench_create_backlog_item` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_create_project_blueprint` | `apps/matriz-workbench/src/mcp/server.ts:331` | `workbench_create_project_blueprint` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_create_snippet` | `apps/matriz-workbench/src/mcp/server.ts:603` | `workbench_create_snippet` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_get_backlog_item` | `apps/matriz-workbench/src/mcp/server.ts:118` | `workbench_get_backlog_item` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_control_snapshot` | `apps/matriz-workbench/src/mcp/server.ts:277` | `workbench_get_control_snapshot` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_engineering_operations_context` | `apps/matriz-workbench/src/mcp/server.ts:224` | `workbench_get_engineering_operations_context` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_package_adoption_readiness` | `apps/matriz-workbench/src/mcp/server.ts:193` | `workbench_get_package_adoption_readiness` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_project_context` | `apps/matriz-workbench/src/mcp/server.ts:75` | `workbench_get_project_context` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_project_inventory` | `apps/matriz-workbench/src/mcp/server.ts:91` | `workbench_get_project_inventory` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_registered_package_summary` | `apps/matriz-workbench/src/mcp/server.ts:178` | `workbench_get_registered_package_summary` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_score_summary` | `apps/matriz-workbench/src/mcp/server.ts:283` | `workbench_get_score_summary` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_get_site_summary` | `apps/matriz-workbench/src/mcp/server.ts:319` | `workbench_get_site_summary` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_interrupt_execution_attempt` | `apps/matriz-workbench/src/mcp/server.ts:533` | `workbench_interrupt_execution_attempt` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_list_agent_requests` | `apps/matriz-workbench/src/mcp/server.ts:213` | `workbench_list_agent_requests` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_approvals` | `apps/matriz-workbench/src/mcp/server.ts:295` | `workbench_list_approvals` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_backlog` | `apps/matriz-workbench/src/mcp/server.ts:103` | `workbench_list_backlog` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_control_notifications` | `apps/matriz-workbench/src/mcp/server.ts:301` | `workbench_list_control_notifications` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_entities` | `apps/matriz-workbench/src/mcp/server.ts:307` | `workbench_list_entities` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_projects` | `apps/matriz-workbench/src/mcp/server.ts:69` | `workbench_list_projects` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_registered_sources` | `apps/matriz-workbench/src/mcp/server.ts:144` | `workbench_list_registered_sources` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_repository_documents` | `apps/matriz-workbench/src/mcp/server.ts:151` | `workbench_list_repository_documents` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_score_evidence` | `apps/matriz-workbench/src/mcp/server.ts:289` | `workbench_list_score_evidence` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_list_snippets` | `apps/matriz-workbench/src/mcp/server.ts:313` | `workbench_list_snippets` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_mark_control_notification` | `apps/matriz-workbench/src/mcp/server.ts:597` | `workbench_mark_control_notification` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_propose_inbox_item` | `apps/matriz-workbench/src/mcp/server.ts:386` | `workbench_propose_inbox_item` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_propose_score_evidence` | `apps/matriz-workbench/src/mcp/server.ts:585` | `workbench_propose_score_evidence` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_propose_site_metadata_update` | `apps/matriz-workbench/src/mcp/server.ts:434` | `workbench_propose_site_metadata_update` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_read_document` | `apps/matriz-workbench/src/mcp/server.ts:129` | `workbench_read_document` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_read_repository_document` | `apps/matriz-workbench/src/mcp/server.ts:163` | `workbench_read_repository_document` | R | `WB-MCP-R` |
| `MCP:matriz-workbench:workbench_reconcile_agent_request` | `apps/matriz-workbench/src/mcp/server.ts:253` | `workbench_reconcile_agent_request` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_record_reconciliation_snapshot` | `apps/matriz-workbench/src/mcp/server.ts:264` | `workbench_record_reconciliation_snapshot` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_review_score_evidence` | `apps/matriz-workbench/src/mcp/server.ts:591` | `workbench_review_score_evidence` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_update_backlog_item` | `apps/matriz-workbench/src/mcp/server.ts:459` | `workbench_update_backlog_item` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_update_snippet` | `apps/matriz-workbench/src/mcp/server.ts:609` | `workbench_update_snippet` | M | `WB-MCP-M` |
| `MCP:matriz-workbench:workbench_write_document` | `apps/matriz-workbench/src/mcp/server.ts:566` | `workbench_write_document` | M | `WB-MCP-M` |

## Counts and zero-endpoint apps

Current tracked-source count: **237** = 142 HTTP methods, 44 Server Actions, and 51 MCP tools.
