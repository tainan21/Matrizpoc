# Matriz Monorepo — V1.1

Monorepo multi-app (Next.js 16 + pnpm workspaces + Turborepo) que prova
estruturalmente o ecossistema Matriz: apps autônomos com **auth
compartilhada real**, packages shared, schemas Prisma por app, registry +
manifests, bus de eventos, external links, onboarding compartilhado,
DTOs versionados, adapters, mappers, login funcional em todos os 5 apps,
scaffolding completo de deploy por app e procedimento de extração futura.

## Antes de qualquer coisa

Leia **[docs/architectural-laws.md](./docs/architectural-laws.md)**. São
12 leis duras que governam o repo. Qualquer PR que viole uma delas é
rejeitado via `pnpm lint` ou via smoke `app-boundaries.test.ts`.

## Apps (5)

| App | Porta dev | Papel | Estratégia de login |
|---|---|---|---|
| `matriz-hub` | 3000 | Consolidador: catálogo, registry/events/links | magic link |
| `spot` | 3001 | Domínio bandas/gigs | OTP |
| `seumei` | 3002 | Domínio estabelecimentos | OTP |
| `contracts` | 3003 | Domínio contratos compartilháveis | magic link |
| `willdash` | 3004 | Metas/atividades/recompensas | magic link |

Cada app é autônomo: Next.js próprio, `vercel.json` próprio, deploy e
(futura) extração independentes. Login é local por app, identidade
visual é local por app, **base de auth é compartilhada**.

## Auth V1.1 (novidade)

- Motor compartilhado em `packages/platform/auth` (provider, hooks,
  guards, strategies, session storage, services, mappers — versionado em
  `/v1`).
- Adoção local em `apps/<app>/src/auth/` (config, provider wrapper,
  guards, session mapper, `use-auth-tenant`).
- Telas de login próprias em
  `apps/<app>/src/domains/login/presentation/`.
- Ver ADR: [docs/adr/0001-auth-v1.1.md](./docs/adr/0001-auth-v1.1.md).

## Package categories (6)

`design/` • `platform/` • `access/` • `integration/` • `flows/` • `foundation/`

Total: 22 packages. Ver [`docs/package-categories.md`](./docs/package-categories.md).

## Scripts principais

```bash
pnpm install                                 # instala o workspace
pnpm dev                                     # roda os 5 apps em paralelo
pnpm --filter @matriz/app-matriz-hub dev     # roda apenas o hub

pnpm -r typecheck                            # typecheck (31/31)
pnpm lint                                    # lint + boundaries (27/27)
pnpm test:smoke                              # smoke tests (53/53)

pnpm tsx tooling/scripts/build-app.ts spot               # build por app
pnpm tsx tooling/scripts/verify-app-boundaries.ts        # L3/L4/L12
pnpm tsx tooling/scripts/export-app.ts spot ./out/spot   # split scaffolding
pnpm tsx tooling/scripts/check-readiness.ts              # score 100/100
```

## Deploy e split

- [docs/build-deploy-model.md](./docs/build-deploy-model.md) — build +
  deploy por app, secrets esperados, rollout.
- [docs/vercel-deployment-map.md](./docs/vercel-deployment-map.md) —
  mapeamento app × diretório × projeto Vercel × subdomínio × repo futuro.
- [docs/app-extraction-model.md](./docs/app-extraction-model.md) —
  procedimento automatizado para promover um app a repositório próprio.

## Docs globais

- [architectural-laws.md](./docs/architectural-laws.md) — **leia primeiro**
- [architecture-overview.md](./docs/architecture-overview.md)
- [monorepo-structure.md](./docs/monorepo-structure.md)
- [shared-contracts.md](./docs/shared-contracts.md)
- [events-conventions.md](./docs/events-conventions.md)
- [external-links.md](./docs/external-links.md)
- [agent-navigation-guide.md](./docs/agent-navigation-guide.md)
- [onboarding-shared-flow.md](./docs/onboarding-shared-flow.md)
- [package-categories.md](./docs/package-categories.md)
- [app-ownership-map.md](./docs/app-ownership-map.md)
- [app-communication.md](./docs/app-communication.md)
- [build-deploy-model.md](./docs/build-deploy-model.md)
- [app-extraction-model.md](./docs/app-extraction-model.md)
- [vercel-deployment-map.md](./docs/vercel-deployment-map.md)
- [audit/v1.1-baseline.md](./docs/audit/v1.1-baseline.md)
- [adr/0001-auth-v1.1.md](./docs/adr/0001-auth-v1.1.md)

## Camada institucional V1.2 (novo)

Sobre a base técnica V1.1, a V1.2 introduz uma **camada institucional**
que transforma o `matriz-hub` em **control plane** do ecossistema
Matriz: capaz de consumir, classificar, consolidar e exibir projetos
heterogêneos (apps internos, fontes externas, legados, MCP, registries
institucionais).

- [control-plane-overview.md](./docs/control-plane-overview.md) — **leia primeiro**
- [project-intelligence-contracts.md](./docs/project-intelligence-contracts.md)
- [source-classification.md](./docs/source-classification.md)
- [ingestion-model.md](./docs/ingestion-model.md)
- [telemetry-institutional-model.md](./docs/telemetry-institutional-model.md)
- [public-site-automation-model.md](./docs/public-site-automation-model.md)
- [theming-governance.md](./docs/theming-governance.md)
- [cross-repo-integration-model.md](./docs/cross-repo-integration-model.md)
- [mcp-capabilities-model.md](./docs/mcp-capabilities-model.md)
- [wallet-future-notes.md](./docs/wallet-future-notes.md)
- [circular-benefits-model.md](./docs/circular-benefits-model.md)
- [migration-strategy-v1-to-real-products.md](./docs/migration-strategy-v1-to-real-products.md)
- [audit/v1.2-institutional.md](./docs/audit/v1.2-institutional.md)

## Status V1.1

- [x] **Auth compartilhada real** com 2 estratégias (OTP, magic link)
- [x] **Login funcional** nos 5 apps, UI própria por app
- [x] **Layout semântico** com `domains/<d>/presentation/` + `src/auth/`
- [x] **Deploy scaffolding** (vercel.json × 5, workflows CI/deploy/split)
- [x] **Extraction scaffolding** (`export-app.ts` + `split-apps.yml`)
- [x] **Smoke tests novos**: auth, auth-strategies, session-storage,
      app-boundaries, public-contracts
- [x] **Readiness score**: 100/100 via `check-readiness.ts`
