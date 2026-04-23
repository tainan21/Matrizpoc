# Telemetry Institutional Model

Status: **implementado** (V1.2, Fase 5) + **conceitual** (extensões futuras).

## Por que existe

A camada técnica V1.1 já tinha `platform-telemetry` com envelope tipado
(`TelemetryEnvelope`) e `api-contracts/v1/telemetry.ts`. Porém, o `type`
era livre — não havia forma de agrupar eventos por **categoria
institucional** (o que interessa para o control plane e para a superfície
pública).

A V1.2 introduz essa dimensão **sem quebrar compatibilidade**: o campo
`category` é **opcional** no envelope. Apps antigos continuam emitindo
eventos como antes; apps novos podem categorizar.

## As 6 categorias

| Categoria | O que representa | Exemplos |
|---|---|---|
| `operational` | Saúde técnica, erros, latência, performance | `api.error`, `cron.failed`, `slow_query` |
| `commercial` | Receita, pedidos, conversão, funil | `order.created`, `payment.succeeded`, `cart.abandoned` |
| `financial` | Pagamentos, faturamento, reembolsos | `invoice.issued`, `refund.processed`, `payout.completed` |
| `adoption` | DAUs, retenção, ativação, engajamento | `user.signed_up`, `session.started`, `feature.used` |
| `ecosystem` | Integrações cross-app, eventos distribuídos | `hub.app.opened`, `external_link.clicked` |
| `institutional` | Indicadores estratégicos (ingestão, readiness, governança) | `institutional.ingestion.completed`, `manifest.updated` |

Definidas em dois lugares, **intencionalmente**:

- `packages/integration/api-contracts/v1/institutional/project-telemetry-summary.ts`
  — o contract público (camada L4 integration).
- `packages/platform/telemetry/src/index.ts` — o motor (camada platform, que
  **não pode** importar integration por política de dependências).

Essa duplicação é pequena (6 strings) e deliberada. Um teste de
consistência entre os dois arrays pode ser adicionado se a lista crescer.

## Arquitetura

```
App/Hub emite envelope
    │
    │  TelemetryEnvelope { type, category? , properties }
    ▼
platform-telemetry client
    │
    │  list()  → envelopes brutos
    │  summarizeTelemetryByApp()  → agregação por (app, category)
    ▼
InstitutionalRegistry / Hub UI
    │
    │  ProjectTelemetrySummary (por projeto)
    ▼
/intelligence (Hub)  +  /public (landing)
```

## ProjectTelemetrySummary

```ts
{
  window: "1h" | "24h" | "7d",
  categories: {
    operational?: { count: number, lastEventAt?: string },
    commercial?:  { count: number, lastEventAt?: string },
    // ...
  },
  topEvents: { name: string, count: number }[],
}
```

Este summary é **persistido no ProjectManifest institucional**. O Hub não
precisa reprocessar envelopes crus a cada render — consome o consolidado.

## Fonte do summary

Na V1.2:
1. Apps internos têm summary **sintético** inicial (via
   `internal-apps-enrichment.ts`), suficiente para popular `/intelligence`
   e provar o conceito.
2. O Hub emite envelopes **reais** categorizados (ex.:
   `institutional.ingestion.completed` com `category: "institutional"`).
3. A API route `/api/institutional/refresh` recalcula summary do Hub a
   partir de `summarizeTelemetryByApp(collectAllTelemetry())`.

No futuro (não nesta fase):
- Cada app emite summary próprio via um endpoint público
  (`/api/institutional/telemetry-summary`) que o `SnapshotPullAdapter`
  consome.
- Janelas deslizantes em Redis/Upstash (L7 dos contracts já permite).

## Relação com o contract técnico V1.1

`TelemetryEventDTO` (envelope cru, `api-contracts/v1/telemetry.ts`) **não
muda**. Ele continua sendo o formato wire-level. O `category` é um campo
opcional adicional no envelope em memória (`TelemetryEnvelope` em
`platform-telemetry`), e o summary consolidado é um contract
**institucional separado** (`ProjectTelemetrySummary`).

Coexistência: envelopes sem `category` funcionam; sistemas antigos não
quebram.

## Governança

- Novas categorias exigem update coordenado em **3 lugares**:
  integration-api-contracts, platform-telemetry, e
  `docs/telemetry-institutional-model.md`.
- Categorias são um **vocabulário fechado** (enum Zod). Não aceitam
  valores livres — mantém a camada institucional auditável.

## Próximos passos (conceitual)

- Windowed summaries por categoria (rolling `1h`/`24h`/`7d`).
- Export Prometheus/OpenTelemetry compatível.
- Categorização automática por heurística no SDK.
- Alertas institucionais quando `operational.count` degrada.
