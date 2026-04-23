# Source Classification

> Taxonomia institucional da origem de cada projeto do ecossistema.
> Referenciada por `ProjectManifest.sourceType` e governa trust,
> readiness e visibilidade pública.

## Os 6 tipos

### `internal_monorepo_app`

Apps que vivem **dentro desta POC** em `apps/<x>/`. Ingeridos via
`local_contract_import` lendo `apps/<x>/public-contract.ts`.

- **Trust padrão**: `core`
- **Exemplos V1.2**: `matriz-hub`, `spot`, `seumei`, `contracts`, `willdash`
- **Visibilidade pública**: permitida com branding próprio do app
- **Governança**: regidos pelas 12 leis L1–L12

### `trusted_external_app`

Produtos **reais** do ecossistema Matriz que vivem fora do monorepo mas
com contrato institucional firmado. Na V1.2 não há um ainda — é o alvo
da migração futura (Seumei real, etc.).

- **Trust padrão**: `trusted`
- **Exemplos V1.2**: nenhum real (scaffold tipado apenas)
- **Visibilidade pública**: permitida
- **Governança**: ingestão via snapshot ou API, assinatura de contract
  institucional obrigatória

### `legacy_app`

Sistemas **em migração** para o padrão Matriz. Ingeridos via snapshot
limitado. Trust reduzido porque a superfície técnica não foi reescrita.

- **Trust padrão**: `external`
- **Visibilidade pública**: opcional (normalmente restrita)
- **Governança**: janela de migração com prazo declarado em `institutionalTags`

### `third_party_service`

Serviços externos (payments, email, analytics). Não são "produtos
Matriz" — são dependências. Aparecem no ecosystem para dar visibilidade
de dependências críticas.

- **Trust padrão**: `external`
- **Visibilidade pública**: normalmente oculta; aparece no `/ecosystem` interno
- **Governança**: sem SoT; apenas metadata declarativa

### `mcp_source`

Servidores MCP (Model Context Protocol) externos que expõem tools,
resources e prompts consumíveis pela rede Matriz.

- **Trust padrão**: `experimental` ou `trusted` caso-a-caso
- **Visibilidade pública**: permitida em `/ecosystem`, opcional em `/public`
- **Governança**: contract `ProjectMcpCapabilities` obrigatório

### `institutional_source`

Registries, catálogos ou fontes institucionais **agregadoras** — não
são produtos consumíveis pelo usuário final, e sim fontes de verdade
institucional sobre outros projetos.

- **Trust padrão**: `trusted`
- **Exemplos V1.2**: `Matriz Ventures Registry` (fonte externa simulada,
  provê lista institucional de ventures da holding)
- **Visibilidade pública**: central na `/public` institucional
- **Governança**: `ingestMode = "snapshot_pull"` ou `"api_pull"`; dados
  tipicamente curados

## Matriz trust × sourceType

| `sourceType`              | Trust típico     | Outros trusts aceitos |
|---------------------------|------------------|-----------------------|
| `internal_monorepo_app`   | `core`           | `experimental` (novos) |
| `trusted_external_app`    | `trusted`        | `core` (pós-auditoria) |
| `legacy_app`              | `external`       | `experimental`        |
| `third_party_service`     | `external`       | `unknown`             |
| `mcp_source`              | `experimental`   | `trusted`, `external` |
| `institutional_source`    | `trusted`        | `core` (curadoria interna) |

## Combinação `sourceType` × `ingestMode` válida

Ver [ingestion-model.md](./ingestion-model.md) para a matriz completa.
Resumo:

| `sourceType`              | Ingest modes permitidos                                  |
|---------------------------|-----------------------------------------------------------|
| `internal_monorepo_app`   | `local_contract_import`, `static_seed`                   |
| `trusted_external_app`    | `api_pull`, `webhook_push`, `snapshot_pull`              |
| `legacy_app`              | `snapshot_pull`, `static_seed`, `manual_registration`    |
| `third_party_service`     | `static_seed`, `manual_registration`                     |
| `mcp_source`              | `api_pull`, `snapshot_pull`, `manual_registration`       |
| `institutional_source`    | `snapshot_pull`, `api_pull`                              |

## Regras de governança visual

- `core` e `trusted`: aparecem em todas as visões (Hub + `/public`).
- `external`: aparecem no Hub; em `/public` apenas se
  `institutionalTags` incluir `"public"`.
- `experimental` e `unknown`: aparecem apenas em `/ecosystem` (interno).

## Auditoria

Smoke `institutional-contracts.test.ts` valida:

- `ProjectManifest.sourceType` pertence ao enum.
- Combinação `sourceType` × `ingestMode` é permitida.
- `trustLevel` é consistente com `sourceType` (warn se fora da
  coluna "Trust típico", fail se em coluna inválida).
