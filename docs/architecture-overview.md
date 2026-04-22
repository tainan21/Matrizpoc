# Architecture Overview

> Visao consolidada da POC Matriz. Para as 11 leis arquiteturais formais,
> ver `architectural-laws.md`.

## Objetivo

Monorepo TypeScript com **5 apps Next.js 16** independentes, que se
comunicam **exclusivamente** via `packages/integration/*` e os
`public-contract.ts` de cada app. Nenhum app conhece a estrutura interna
de outro (L3/L4).

## Apps (5)

| App | Dominio | Papel no ecossistema |
|-----|---------|----------------------|
| `matriz-hub` | Sem dominio proprio | Central. Registry, eventos, external-links, onboarding-status, feature-flags, telemetria consolidada. |
| `spot` | Bandas, gigs, perfis artisticos | Produz `spot.gig.created` e `contract.created`. |
| `seumei` | Estabelecimentos, ofertas, donos | Produz `seumei.establishment.selected` e `contract.created`. |
| `contracts` | Contratos | Consome `contract.created` de spot/seumei. Produz `contract.linked`. |
| `willdash` | Metas, atividades, recompensas | Produz `willdash.goal.opened` e `willdash.activity.logged`. Consome `contract.created` e `onboarding.completed` para agregacao. |

Cada app tem: `src/manifest/manifest.ts` (L2), `src/bootstrap/index.ts`
(L11), `public-contract.ts` (L2/L3), `docs/README.md` (este nivel).

## Categorias de packages (6)

- `design/` — visual compartilhado (`ui`, `system`).
- `platform/` — servicos tecnicos (`auth`, `storage`, `notifications`,
  `telemetry`, `pdf`, `config`, `i18n`, `env`).
- `access/` — contexto de seguranca (`tenants`, `permissions`).
- `integration/` — comunicacao publica cross-app (`events`,
  `registry-core`, `manifests`, `external-links`, `api-contracts`).
- `flows/` — fluxos compartilhaveis (`onboarding`).
- `foundation/` — base universal (`types`, `utils`, `constants`, `schemas`).

Ver `package-categories.md` para regras de dependencia entre camadas.

## Comunicacao cross-app

Tres canais, **nesta ordem de preferencia**:

1. **Event bus global** (`@matriz/integration-events`) — pub/sub tipado.
   Envelopes carregam `tenantId` e sao validados contra
   `MATRIZ_EVENT_NAMES` (`foundation-constants`).
2. **DTOs versionados v1** (`@matriz/integration-api-contracts/v1`) —
   contratos de entrada/saida entre gateways e adapters. Validados com
   Zod no anti-corrupcao.
3. **External links** (`@matriz/integration-external-links`) — indices
   persistentes do tipo `(originApp, originId) -> (targetApp, targetId)`.

Ver `app-communication.md` e `events-conventions.md`.

## Fluxos ativos

1. **Spot -> Contracts**: `Gig` vira `Contract` via adapter DDD->DTO,
   evento `contract.created` e `external-link`.
2. **Seumei -> Contracts**: idem com `Establishment`.
3. **Hub <- todos**: Hub observa `hub.app.opened`, `onboarding.completed`
   e todos os outros eventos via `TelemetryClient`, renderizando
   `/events` e `/telemetry`.
4. **WillDash <- todos**: aggregator de telemetria acumula metricas
   cross-app por tenant.

## Validacao automatica

- **Typecheck**: 27 projetos (22 packages + 5 apps).
- **Lint**: ESLint com `no-restricted-paths` proibindo imports
  `apps/*/src/**` fora do proprio app (L3/L4).
- **Smoke tests** (Vitest, 32 testes):
  - `dtos.test.ts` — Zod em DTOs v1.
  - `events.test.ts` — envelope envelope + pub/sub.
  - `external-links.test.ts` — store idempotente.
  - `manifests.test.ts` — todos os 5 manifests validos.
  - `registry.test.ts` — registro + lookup.
  - `application-flow.test.ts` — fluxos Spot->Contracts, Seumei->Contracts, multi-tenant isolation.

## Comandos

```bash
pnpm typecheck       # 27/27
pnpm lint            # 27/27, 0 warnings
pnpm test:smoke      # 32 testes
pnpm --filter @matriz/app-<app> dev
```
