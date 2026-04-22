# WillDash

> App de dominio de **metas, atividades e recompensas**. Produz eventos
> proprios (`willdash.goal.opened`, `willdash.activity.logged`) e observa
> eventos do ecossistema para agregacoes. Tambem e o exemplo canonico de
> **producer + consumer** do event bus.

---

## Dominio

| Entidade | Chave branded | Descricao |
|----------|---------------|-----------|
| `Goal` | `GoalId` | Meta com `title`, `metricUnit`, `targetValue`, `currentValue`, `status` (`active \| paused \| completed \| archived`), `createdAt`. |
| `ActivityRecord` | `ActivityId` | Registro de atividade associado a uma meta (`kind`, `amount`, `loggedAt`). |
| `RewardRule` | `RewardRuleId` | Regra: ao atingir `threshold` em `metricUnit`, entrega `reward`. |

Isolamento por `tenantId` em toda agregacao e repositorio.

## Arquitetura (Clean)

```
app/
  page.tsx                    # overview
  goals/page.tsx
  goals/GoalActions.tsx       # "use client" — emite willdash.goal.opened e willdash.activity.logged
  activities/page.tsx
  telemetry/page.tsx
  dashboards/page.tsx
  onboarding/page.tsx
src/
  domain/models/index.ts
  domain/repositories/index.ts
  application/
    use-cases.ts
    telemetry-aggregator.ts   # agrega metricas cross-app por tenant
  mock/{seeds,repositories}.ts
  ui/components/{AppShell,BootstrapGuard}.tsx
  ui/presenters/goal.presenter.ts
  bootstrap/index.ts          # L11
  lib/container.ts
public-contract.ts            # L2
```

## Integracoes

| Tipo | Detalhe |
|------|---------|
| Eventos produzidos | `willdash.goal.opened`, `willdash.activity.logged` |
| Eventos consumidos | `onboarding.completed`, `contract.created` (para agregacoes de dashboard) |
| Telemetria | `TelemetryClient("willdash")` + `createTelemetryAggregator()` subscrito no bus |
| Onboarding | Step proprio via `registerAppStep(asAppId("willdash"))` |

## Fluxo de emissao

1. Usuario clica "Abrir meta" em `/goals` (`GoalActions.tsx`).
2. Use case local atualiza `Goal.status = "active"`.
3. Emite `willdash.goal.opened` no `getGlobalEventBus()` (payload: `goalId`, `tenantId`, `title`).
4. Todos os apps subscritos recebem (Hub loga, WillDash agrega).
5. Quando clica "Registrar sessao" -> `willdash.activity.logged` e emitido.

## Regras (L3/L4)

- **Nunca** le dados de outros apps via tabela — apenas via eventos publicos.
- `public-contract.ts` expoe apenas o manifest.

## Como rodar

```bash
pnpm --filter @matriz/app-willdash dev
pnpm --filter @matriz/app-willdash typecheck
```
