# Ingestion Model

> Como a Matrizpoc consome e consolida projetos heterogêneos no
> **Institutional Registry**. Governa `ProjectManifest.ingestMode`
> e vive em `packages/integration/ingestion/`.

## Os 6 modos

### `static_seed`

Dados hard-coded em JSON/TS dentro do monorepo. Útil para bootstrapping,
simulação e scaffolds conceituais.

- **Exemplo V1.2**: Matriz Ventures Registry (fonte externa simulada)
- **Refresh**: reinício do Hub
- **Implementação**: `StaticSeedAdapter`

### `local_contract_import`

Lê o `apps/<x>/public-contract.ts` de um app interno e **deriva** um
`ProjectManifest` institucional a partir do `AppManifestDTO` técnico +
metadata institucional declarada localmente.

- **Exemplo V1.2**: `spot`, `seumei`, `contracts`, `willdash`, `matriz-hub`
- **Refresh**: a cada bootstrap do Hub
- **Implementação**: `LocalContractImportAdapter`

### `snapshot_pull`

Lê um snapshot serializado (JSON) de fonte externa (URL, arquivo, blob).
Útil para legacy e fontes institucionais curadas.

- **Exemplo V1.2 (real)**: Matriz Ventures Registry lê
  `apps/matriz-hub/src/institutional/seeds/ventures-snapshot.json`
  como se fosse um snapshot remoto.
- **Refresh**: sob demanda via `/api/ingestion/refresh`
- **Implementação**: `SnapshotPullAdapter`

### `api_pull`

Poll HTTP contra um endpoint do projeto externo (ex.: `/institutional/manifest`).

- **Exemplo V1.2**: apenas scaffold tipado (`ApiPullAdapter` stub)
- **Refresh**: intervalo configurável (V1.3+)
- **Implementação**: interface + stub lançando `NotImplementedError`

### `webhook_push`

Fonte externa **empurra** updates via webhook HTTP assinado.

- **Exemplo V1.2**: scaffold tipado
- **Implementação**: interface + stub

### `manual_registration`

Administrador registra manualmente via UI do Hub (V1.3+).

- **Exemplo V1.2**: scaffold tipado
- **Implementação**: interface + stub

## Interface canônica

```ts
export interface IngestionAdapter {
  readonly id: string
  readonly mode: IngestionMode
  readonly supports: SourceClassification[]

  ingest(ctx: IngestionContext): Promise<IngestionResult>
}

export interface IngestionContext {
  now: Date
  fetchJson?: (url: string) => Promise<unknown>
  logger: { info: (msg: string, meta?: unknown) => void; warn: Function; error: Function }
}

export interface IngestionResult {
  adapterId: string
  mode: IngestionMode
  projects: ProjectManifest[]
  errors: { sourceHint: string; message: string }[]
  ranAt: string // ISO
  durationMs: number
}
```

## Pipeline de ingestão

1. **Hub bootstrap** (`apps/matriz-hub/src/bootstrap/index.ts`) instancia
   todos os adapters ativos via `createIngestionPipeline(adapters)`.
2. Pipeline executa adapters em paralelo (por adapter) ou sequencial (por
   escolha do adapter).
3. Cada `ProjectManifest` produzido é **validado** com Zod antes de
   entrar no registry.
4. Registry institucional é **substituído atomicamente** a cada refresh
   (swap completo; sem merge parcial).
5. Visões do Hub consomem via SWR.

## Refresh

- **Trigger inicial**: `bootstrap()` do Hub.
- **Trigger sob demanda**: rota `POST /api/ingestion/refresh` no Hub.
- **Trigger automático** (V1.3+): intervalo configurável por adapter.

Botão "Atualizar ecossistema" em `/projects` dispara o trigger manual e
mostra delta (projetos novos, removidos, mudanças de health).

## Matriz `sourceType` × `ingestMode`

Repete a tabela de [source-classification.md](./source-classification.md):

| `sourceType`              | Ingest modes permitidos                               |
|---------------------------|--------------------------------------------------------|
| `internal_monorepo_app`   | `local_contract_import`, `static_seed`                |
| `trusted_external_app`    | `api_pull`, `webhook_push`, `snapshot_pull`           |
| `legacy_app`              | `snapshot_pull`, `static_seed`, `manual_registration` |
| `third_party_service`     | `static_seed`, `manual_registration`                  |
| `mcp_source`              | `api_pull`, `snapshot_pull`, `manual_registration`    |
| `institutional_source`    | `snapshot_pull`, `api_pull`                           |

Smoke test bloqueia combinações fora da matriz.

## Classificação da entrega V1.2

- **Implementação funcional**: `StaticSeedAdapter`, `LocalContractImportAdapter`, `SnapshotPullAdapter`.
- **Scaffold estrutural**: `ApiPullAdapter`, `WebhookPushAdapter`, `ManualRegistrationAdapter` — interfaces tipadas que lançam `NotImplementedError`.
- **Conceito apenas**: refresh automático por intervalo; assinatura de webhook; UI de registro manual.

## Respeito a L1–L12

- Vive em `packages/integration/ingestion/` (nova sub-área de
  `integration/`). Não é package pai; é sub-módulo do integration.
- Não importa `packages/design/*` nem `packages/flows/*`.
- Não conhece domínio forte (L12).
- Produz apenas `ProjectManifest` institucional — não toca em DTOs de
  domínio.
- É ativado por `bootstrap()` do Hub (L11).
