# Matriz Hub

> Central app do ecossistema Matriz. Orquestra registry, eventos, external
> links, onboarding compartilhado, feature flags e telemetria consolidada.
> Nao possui dominio proprio — e um **consumidor puro** dos `public-contract`
> dos demais apps (L2/L3).

---

## Dominio

Hub nao modela entities de negocio. Ele apenas:

- **Le** manifests (via `@apps/*/public-contract`).
- **Observa** o event bus global e registra envelopes em memoria.
- **Consulta** o `OnboardingStore` global e o `ExternalLinkStore` global.
- **Expoe** feature flags mock por tenant + app (via `@matriz/platform-config`).
- **Agrega** envelopes de telemetria (via `collectAllTelemetry()` de
  `@matriz/platform-telemetry`).

## Arquitetura (Clean)

```
app/                        # Next.js routes
  page.tsx                  # landing + catalog cards
  catalog/                  # /catalog
  registry/                 # /registry
  events/                   # /events
  external-links/           # /external-links
  onboarding-status/        # /onboarding-status
  feature-flags/            # /feature-flags
  telemetry/                # /telemetry
  praticies/                # /praticies — automacoes e utilidades locais
  api/                      # route handlers (JSON read-only)
src/
  manifest/manifest.ts      # L2 — source of truth
  bootstrap/index.ts        # L11 — registra 8 manifests + TelemetryClient
  ui/components/HubShell.tsx
  domains/praticies/        # domain -> application -> integration -> presentation
  ui/presenters/            # L6 — manifests -> ViewModels
public-contract.ts          # L2 — apenas manifest + tipos publicos
```

## Integracoes

| Tipo | Detalhe |
|------|---------|
| Eventos produzidos | `hub.app.opened` (quando usuario abre um app a partir do catalogo) |
| Eventos consumidos | Hub **nao consome** para disparar side-effects; apenas **observa** via telemetria: `onboarding.completed`, `contract.created`, `contract.linked`, `spot.gig.created`, `seumei.establishment.selected`, `willdash.goal.opened`, `willdash.activity.logged` |
| Gateways | Nenhum — apenas leituras cross-app via contratos publicos |
| Adapters | `src/ui/presenters/*` (manifest -> ViewModel) |
| Telemetria | Agrega `TelemetryEnvelope` de todos os apps registrados via `getGlobalTelemetryRegistry()` |
| Storage | Apenas leituras de `KeyValueStore` in-memory dos stores globais |

## Regras (L3/L4)

- **PODE** importar `@apps/<app>/public-contract` para ler manifests.
- **NAO PODE** importar `apps/<app>/src/**` ou `apps/<app>/app/**`.
- UI passa por presenters em `src/ui/presenters/` (L6).
- Toda rota Next.js chama `bootstrapMatrizHub()` no topo (idempotente).

## Praticies

`/praticies` e uma superficie imersiva autenticada para automacoes pequenas do
workspace. A primeira capability gera mapas estruturais em `.patterns/` sem ler
arquivos. Consulte `docs/PRACTICIES.md` antes de adicionar uma nova praticidade.

## Como rodar

```bash
pnpm --filter @matriz/app-matriz-hub dev
pnpm --filter @matriz/app-matriz-hub typecheck
pnpm --filter @matriz/app-matriz-hub lint
```
