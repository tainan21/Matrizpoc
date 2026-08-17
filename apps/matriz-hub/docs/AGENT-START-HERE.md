# Matriz Hub — Agent Start Here

> Read this file first before touching Matriz Hub. Do NOT scan the full repo.

## 30-second overview
Matriz Hub is the central entry point of the ecosystem. It reads manifests
from every other app, shows the app catalog, event timeline, external links
explorer, onboarding status and feature flags.

## Where to look
1. `src/manifest/manifest.ts` — the authoritative manifest of this app (L2).
2. `src/bootstrap/index.ts` — the single runtime entry point (L11).
3. `public-contract.ts` — the only file other apps may import from here (L2/L3).
4. `src/registry/` — Hub's registry bootstrap (imports `@apps/*/public-contract`).
5. `src/ui/` — components, screens, presenters (L6).
6. `app/` — Next.js routes.
7. `src/api/` — route handlers (`/api/registry`, `/api/events`, `/api/telemetry`, etc.).
8. `docs/README.md` — visao consolidada do app (dominio, integracoes, regras).
9. `docs/PRACTICIES.md` — arquitetura e evolução da bancada de utilidades locais.

## Packages relevant to this app
- `@matriz/integration-registry-core`, `@matriz/integration-manifests`, `@matriz/integration-events`, `@matriz/integration-external-links`, `@matriz/integration-api-contracts`
- `@matriz/platform-config` (feature flags), `@matriz/platform-telemetry`
- `@matriz/design-ui`, `@matriz/design-system`

## Rules (L3/L4)
- You may import `@apps/<app>/public-contract` to read their manifests.
- You MUST NOT import `apps/<app>/src/**` or `apps/<app>/app/**`.
- UI must go through presenters in `src/ui/presenters/` (L6).

## Praticies

- A rota imersiva `/praticies` continua dentro do `AuthGate`, mas não usa o
  `HubShell` para ocupar o viewport inteiro.
- Toda automação nova precisa de escopo fixo, output explícito e ausência de
  input de caminho arbitrário.
- Mantenha utilidades em `src/domains/praticies` enquanto apenas o Hub as
  consumir. Não extraia para package por antecipação.
