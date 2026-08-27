# ADR 0004 — Local/cloud profiles, tunnel and ports

Status: accepted — 2026-08-25

## Decision

Run Ops on 3009 and Pay on 3010. The pre-existing Matriz Control local cockpit moves from 3009 to 3011 to remove the collision; Matriz Admin remains on 3002. The `local` profile uses persistent local PostgreSQL and an allowlisted HTTPS tunnel for provider callbacks. `cloud` changes endpoints and secret sources only, never domain rules.

Desktop is an online Ops client. It stores tokens only in operating-system secure storage and does not persist users, balances, ledger data or provider credentials.
