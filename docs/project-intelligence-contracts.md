# Project Intelligence Contracts

> Especificação canônica dos contracts institucionais da V1.2.
> Vive em `packages/integration/api-contracts/src/v1/institutional/`.
> Coexiste com os contracts técnicos pré-existentes (V1.1).

## Princípios

1. **Domain-free (L12)**. Nenhum contract institucional menciona
   `gig`, `establishment`, `contract`, `goal`, `activity` ou qualquer
   outro termo de domínio forte de app.
2. **Versionados (L7)**. Nascem em `v1/institutional/`. V2 futura em
   `v2/institutional/`.
3. **Validados com Zod**. Cada contract exporta `XxxSchema` (Zod) e
   `Xxx` (tipo inferido).
4. **Branded onde faz sentido**. `ProjectId` é branded para impedir
   substituição por `string` arbitrária.
5. **Independentes de origem**. Um `ProjectManifest` descreve com o
   mesmo formato um app interno, um legado, um terceiro, uma fonte MCP
   ou uma fonte externa simulada.

## Contracts

### `SourceClassification`

Enum que classifica a **origem** de um projeto.

```ts
type SourceClassification =
  | "internal_monorepo_app"   // apps/<x> desta POC
  | "trusted_external_app"    // produto real integrado, confiável
  | "legacy_app"              // sistema legado em migração
  | "third_party_service"     // serviço terceirizado (payments, email, etc.)
  | "mcp_source"              // servidor MCP externo
  | "institutional_source"    // registry/catálogo institucional (ex.: Ventures)
```

Ver [source-classification.md](./source-classification.md) para trust,
governança e critérios.

### `ProjectId`

Branded string com padrão `{prefix}:{slug}`, ex.: `matriz:spot`,
`ventures:north-star-labs`, `legacy:booking-crm`.

### `ProjectManifest`

O contract institucional central. Descreve um projeto inteiro do
ecossistema Matriz de forma uniforme.

Campos:

- `projectId: ProjectId`
- `displayName: string`
- `sourceType: SourceClassification`
- `trustLevel: "core" | "trusted" | "external" | "experimental" | "unknown"`
- `ingestMode: IngestionMode` (ver `ingestion-model.md`)
- `contractVersion: "v1"`
- `brand: ProjectBrandIdentity`
- `capabilities: ProjectIntegrationCapabilities`
- `health: ProjectHealthSnapshot`
- `metrics?: ProjectPublicMetrics`
- `telemetry?: ProjectTelemetrySummary`
- `mcp?: ProjectMcpCapabilities`
- `institutionalTags: string[]` (ex.: `"holding"`, `"saas"`, `"marketplace"`)
- `ownership: { owner: string; contact?: string; repo?: string }`
- `links: { kind: "docs" | "site" | "app" | "repo" | "status"; url: string }[]`
- `ingestedAt: string` (ISO)

### `ProjectBrandIdentity`

Identidade visual do projeto.

- `brandName: string`
- `tagline?: string`
- `primaryColor: string` (hex)
- `secondaryColor?: string`
- `accentColor?: string`
- `logoText?: string`
- `tone: "institutional" | "product" | "experimental" | "legacy"`

### `ProjectHealthSnapshot`

Saúde operacional no momento da ingestão.

- `status: "healthy" | "degraded" | "offline" | "unknown"`
- `readinessScore: number` (0–100)
- `lastCheckAt: string` (ISO)
- `checks: { name: string; status: "pass" | "warn" | "fail"; detail?: string }[]`
- `uptimeWindow?: "24h" | "7d" | "30d"`
- `uptimePercent?: number`

### `ProjectPublicMetrics`

Métricas públicas (seguras para superfície pública).

- `activeUsers?: number`
- `reach?: number`
- `publishedItems?: number`
- `lastActivityAt?: string`
- `customMetrics?: { key: string; label: string; value: number; unit?: string }[]`

### `ProjectIntegrationCapabilities`

O que o projeto oferece / consome como superfície institucional.

- `produces: { kind: "event" | "dto" | "link" | "webhook"; name: string; version?: string }[]`
- `consumes: { kind: "event" | "dto" | "link" | "webhook"; name: string; version?: string }[]`
- `exposes: { kind: "page" | "api" | "mcp-tool" | "widget" | "feed"; name: string; path?: string }[]`
- `requires: { kind: "auth" | "tenant" | "permission" | "flag"; name: string }[]`

### `ProjectTelemetrySummary`

Resumo da telemetria institucional (ver [telemetry-institutional-model.md](./telemetry-institutional-model.md)).

- `window: "1h" | "24h" | "7d"`
- `categories: Record<TelemetryCategory, { count: number; lastEventAt?: string }>`
  - `TelemetryCategory = "operational" | "commercial" | "financial" | "adoption" | "ecosystem" | "institutional"`
- `topEvents: { name: string; count: number }[]`

### `ProjectMcpCapabilities`

Scaffold tipado para futuras integrações MCP. Atualmente **declarativo**:
descreve o que o projeto exporia como servidor MCP, sem que um servidor
real precise existir.

- `serverName?: string`
- `tools: { name: string; description?: string; inputSchemaRef?: string }[]`
- `resources: { uriTemplate: string; description?: string }[]`
- `prompts: { name: string; description?: string }[]`
- `status: "declared" | "stub" | "available"`

## Smoke tests obrigatórios (L8)

- `tests/smoke/institutional-contracts.test.ts`
  - cada schema valida exemplo válido e rejeita inválido
  - `ProjectManifest` cross-valida `ingestMode` ↔ `sourceType`
  - `trustLevel` é consistente com `sourceType`
- `tests/smoke/institutional-registry.test.ts` (Fase 2)
- `tests/smoke/ingestion.test.ts` (Fase 2)

## Relação com contracts técnicos

| Contract técnico (V1.1) | Contract institucional (V1.2) |
|---|---|
| `AppManifestDTO` — manifest de um app do monorepo | `ProjectManifest` — manifest institucional de qualquer projeto |
| `TelemetryEventDTO` — 1 envelope de evento | `ProjectTelemetrySummary` — resumo agregado por categoria |
| `GigSummaryDTO`, `EstablishmentSummaryDTO`, etc. | nenhum equivalente — institucional não fala de domínio |

A camada institucional **não lê** os DTOs de domínio. Ela lê apenas
manifest técnico + eventos agregados + metadata institucional fornecida
pela fonte.

## Barrel

```ts
// packages/integration/api-contracts/src/v1/institutional/index.ts
export * from "./source-classification"
export * from "./project-brand-identity"
export * from "./project-health-snapshot"
export * from "./project-public-metrics"
export * from "./project-integration-capabilities"
export * from "./project-telemetry-summary"
export * from "./project-mcp-capabilities"
export * from "./project-manifest"
```

Consumidores importam via:

```ts
import { ProjectManifest, ProjectManifestSchema }
  from "@matriz/integration-api-contracts/v1/institutional"
```
