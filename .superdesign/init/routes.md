# Route Map

| URL | Entry | Layout | Purpose |
| --- | --- | --- | --- |
| `/` | `apps/matriz-ops/app/page.tsx` | `AppShell` after auth | Real identity/access overview |
| `/users` | `apps/matriz-ops/app/users/page.tsx` | `AppShell` after auth | User directory with status, grants, tenants and sessions |
| `/users/[userId]` | planned | `AppShell` | User detail and controlled mutations |
| `/platforms` | planned | `AppShell` | Registry and dependency health |
| `/telemetry` | planned | `AppShell` | Persistent usage/error/latency aggregates |
| `/wallets` | planned | `AppShell` | MTRZ and BRL wallet search/history |
| `/finance` | planned | `AppShell` | Celcoin and reconciliation operations |
| `/audit` | planned | `AppShell` | Immutable sanitized audit timeline |
| `/settings` | planned | `AppShell` | Runtime profile and integration readiness |

API routes are not visual targets. Matriz Pay exposes only an internal status page; its human workflow lives in Ops.
