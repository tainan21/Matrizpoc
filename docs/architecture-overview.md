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

- **Typecheck**: 31 projetos (22 packages + 5 apps + tooling).
- **Lint**: ESLint flat config com `no-restricted-imports` proibindo
  imports `apps/*/src/**` fora do proprio app (L3/L4), presentation
  acessando domain (L6) e auth tocando domain (L12).
- **Smoke tests** (Vitest, 11 suites / 53 testes):
  - `dtos.test.ts` — Zod em DTOs v1.
  - `events.test.ts` — envelope + pub/sub.
  - `external-links.test.ts` — store idempotente.
  - `manifests.test.ts` — todos os 5 manifests validos.
  - `registry.test.ts` — registro + lookup.
  - `application-flow.test.ts` — fluxos cross-app + multi-tenant.
  - `auth.test.ts` — superficie publica do platform-auth V1.1.
  - `auth-strategies.test.ts` — OTP + magic link start/verify.
  - `session-storage.test.ts` — namespacing e round-trip.
  - `app-boundaries.test.ts` — L3/L4/L12 por varredura de arquivos.
  - `public-contracts.test.ts` — L3 (manifest-only).

## Auth V1.1 (novo)

Auth compartilhada real em `packages/platform/auth/v1`:

- Motor (provider, hooks, guards, strategies, storage adapter, services,
  mappers) no package.
- UI + copy + branding ficam em `apps/<app>/src/domains/login/presentation/`.
- Estratégias pluggáveis: `createOtpStrategy()` e
  `createMagicLinkStrategy()`, selecionadas em `apps/<app>/src/auth/config.ts`.
- Sessão namespaced por `appId` via `createAppSessionStorage(appId)`.

Detalhe em [adr/0001-auth-v1.1.md](./adr/0001-auth-v1.1.md).

## Deploy e split

Cada app é uma unidade de deploy Vercel independente, com `vercel.json`
próprio. Workflows em `.github/workflows/`:

- `ci.yml` — typecheck + lint + smoke + boundaries + readiness.
- `deploy-apps.yml` — deploy hooks por app, em matrix.
- `split-apps.yml` — export + push para repositório externo.

Detalhes em `build-deploy-model.md`, `vercel-deployment-map.md`,
`app-extraction-model.md`.

## Comandos

```bash
pnpm -r typecheck       # 31/31
pnpm lint               # 27/27
pnpm test:smoke         # 53/53
pnpm --filter @matriz/app-<app> dev
pnpm tsx tooling/scripts/check-readiness.ts   # score 100/100
```

## Camada institucional V1.2

Sobre a base técnica descrita acima, a V1.2 introduz uma **camada
institucional** que não substitui nada e não cria exceções a L1–L12.
Ela adiciona:

- **Contracts institucionais** em
  `packages/integration/api-contracts/src/v1/institutional/`
  (`ProjectManifest`, `ProjectHealthSnapshot`, `ProjectPublicMetrics`,
  `ProjectTelemetrySummary`, `ProjectIntegrationCapabilities`,
  `ProjectBrandIdentity`, `ProjectMcpCapabilities`, `SourceClassification`).
- **Institutional registry** em
  `packages/integration/registry-core/src/institutional-registry.ts`.
- **Ingestion pipeline** em `packages/integration/ingestion/` com 3
  adapters funcionais (`StaticSeedAdapter`, `LocalContractImportAdapter`,
  `SnapshotPullAdapter`) e 3 scaffolds (`ApiPullAdapter`,
  `WebhookPushAdapter`, `ManualRegistrationAdapter`).
- **Hub como control plane**: páginas `/projects`, `/projects/[id]`,
  `/health`, `/ecosystem`, `/intelligence`.
- **Superfície pública institucional**: `/public` consumindo branding,
  métricas e capabilities de projetos classificados como públicos.
- **Telemetria institucional** com 6 categorias
  (`operational` | `commercial` | `financial` | `adoption` | `ecosystem`
  | `institutional`).
- **Fonte externa simulada**: `Matriz Ventures Registry`
  (`institutional_source`, `snapshot_pull`) provando consumo
  heterogêneo sem dependência de rede real.

Para detalhes, começar por
[control-plane-overview.md](./control-plane-overview.md).
