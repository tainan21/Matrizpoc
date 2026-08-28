# Matriz Ops — Design System and Product Brief

Matriz Ops is a security-sensitive internal control center for a small team of trusted platform operators. It exposes real identity, access, platform telemetry, MTRZ/BRL wallet operations, Celcoin reconciliation and immutable audit records. It is not a marketing dashboard.

## Experience principles

1. Operational truth first: current state, timestamp, source and health must be visible.
2. Calm density: fit expert workflows without turning the page into a wall of tiny text.
3. Dangerous actions look deliberately different and always expose reason, typed confirmation, recent-session and OTP requirements.
4. Financial information uses tabular numerals and explicit MTRZ/BRL units; no ambiguous floats.
5. Every empty/error state explains whether the cause is no data, no permission, unavailable dependency or pending reconciliation.
6. Desktop is primary; responsive web remains functional. Tauri mirrors the online app and stores no domain data offline.

## Visual language

Preserve the Matriz Admin Desktop family: near-black violet canvas, restrained purple brand light, crisp 1px borders, compact navigation and glass-like raised surfaces. Elevate it into a mature operations cockpit with better hierarchy, status semantics, compact charts and a strong audit trail. Avoid generic SaaS blues, neon cyberpunk decoration, oversized marketing headings, serif fonts and gratuitous gradients.

Use only Inter/system sans. Palette: canvas `#09080d`, surface `#121018`, raised `#18131f`, text `#f4f1fb`, muted `#aaa0b7`, faint `#8e879d`, brand `#6d4aff`, brand-highlight `#a98cff`, success `#3ddc97`, warning `#f0b85a`, danger `#ff7b8a`, info `#82adff`, border `#292331`. Use 8/12/14/18px radii, 4px spacing base and subtle shadows. Motion is 120–280ms and never obscures state changes.

## Core pages

- Overview: platform pulse, active users/sessions, telemetry freshness, Pay/Celcoin/reconciliation status, alerts and recent high-risk actions.
- Users: search/filter directory, lifecycle status, tenant/grant/session summary and user detail drawer/page.
- Platforms: registry, version, health, last signal, latency and dependency state.
- Telemetry: 24h/7d actives, sessions, events, error trend, p95 and raw-to-daily retention clarity.
- Wallets: user lookup, MTRZ/BRL balances, immutable history, guarded MTRZ adjustment and reversal.
- Finance: Celcoin readiness, pending BRL intents, webhook inbox, retry/dead-letter and reconciliation discrepancies.
- Audit: immutable timeline with actor, reason, sanitized before/after, correlation and outcome.
- Settings: runtime profile, tunnel readiness and secret-presence indicators only; never render credentials.

## Component behavior

Sidebar stays stable. Page headers show environment and freshness. KPI cards include label, value, delta/context and source timestamp. Tables support search, filters, pagination and clear focus states. Status badges use both color and text/icon. Destructive forms use a dedicated danger surface, require the literal confirmation word and never prefill reasons. Financial mutations never offer bulk selection.
