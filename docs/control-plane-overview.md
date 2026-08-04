# Control Plane Overview — Camada institucional da Matrizpoc

> Documento canônico da **camada institucional** introduzida em V1.2.
> Complementa (não substitui) a camada técnica descrita em
> [architectural-laws.md](./architectural-laws.md) e
> [architecture-overview.md](./architecture-overview.md).

## O que é o control plane institucional

### Regra de honestidade operacional

Status operacional carrega origem, natureza, instante de coleta, frescor e
confianca. Dados decorativos ou institucionais sem check executado sao
`declared` ou `simulated` e aparecem como `unknown`; nao produzem badge de
health saudavel. Ambientes observados usam `ProjectEnvironment` e
`ObservationMeta`. Falha de coleta preserva o erro sem transformar ausencia de
integracao em indisponibilidade do projeto.

A Matrizpoc V1.1 provou **disciplina arquitetural técnica**: manifests,
DTOs, registry, eventos, external-links, boundaries, auth compartilhada.

A V1.2 introduz, sobre essa base, uma **camada institucional**:
uma forma padronizada de descrever **qualquer projeto** (interno da POC,
legado, terceiro, fonte externa, fonte MCP) como um cidadão do ecossistema
Matriz, e de consolidar, classificar, monitorar e exibir essa rede.

O conceito é: o **Matriz Hub** deixa de ser apenas um agregador técnico
de 5 apps do monorepo e passa a ser o **control plane** do ecossistema
— um app que também é um plano de controle, capaz de consumir projetos
reais e simulados, internos e externos.

## Por que existe

A V1.1 responde bem a "como os 5 apps conversam". A V1.2 precisa
responder a perguntas institucionais:

- Quem são os projetos do ecossistema Matriz hoje?
- Qual é a origem de cada um (monorepo interno? legado? terceiro? MCP?)?
- Qual o nível de confiança (trust) de cada um?
- Como cada um foi ingerido (import local? snapshot? API? webhook?)?
- Qual é a saúde operacional de cada um (readiness, health, integrations)?
- Quais capabilities cada um oferece ao ecossistema?
- Qual é a identidade de marca (brand) de cada um?
- Quais métricas públicas expõe?
- Qual telemetria institucional produz (operational, commercial,
  financial, adoption, ecosystem, institutional)?

Estas perguntas são respondidas pela **camada institucional**: contracts
+ registry institucional + ingestion + visões no Hub + superfície
pública.

## Relação com as leis L1–L12

A camada institucional **não cria exceções** às 12 leis. Ela se encaixa
assim:

| Lei | Como a camada institucional a respeita |
|---|---|
| L1 schema por app | Nenhuma mudança de schema Prisma. |
| L2 manifest como SoT | `ProjectManifest` institucional **coexiste** com `AppManifestDTO` técnico. Apps internos continuam sendo SoT do próprio manifest técnico. |
| L3 public-contract manifest-only | Para apps internos, o registry institucional deriva de `apps/<x>/public-contract.ts` — nada muda. |
| L4 imports | Contracts institucionais vivem em `packages/integration/api-contracts/src/v1/institutional/` — mesma política. |
| L5 adapters | `IngestionAdapter` segue o padrão de adapter/repository. |
| L6 ViewModel | Visões institucionais do Hub usam presenters dedicados. |
| L7 DTOs versionados | Contracts institucionais nascem em `v1/institutional/`. |
| L8 smoke tests | Novos smoke para contracts institucionais e ingestion. |
| L9 ownership | `docs/app-ownership-map.md` é atualizado. |
| L10 feature flags | Sem impacto. |
| L11 bootstrap único | Ingestion é ativada dentro do `bootstrap()` do Hub. |
| L12 packages sem domínio forte | Contracts institucionais são **domain-free**: falam de `project`, `health`, `metrics`, `brand`, `capability`, `source` — não de gig, establishment, contract, goal. |

## Arquitetura em 4 camadas

```
┌──────────────────────────────────────────────────────────────────┐
│  1. SOURCES                                                      │
│  Apps internos da POC (spot, seumei, contracts, willdash,        │
│  matriz-hub) · Fontes externas simuladas (Matriz Ventures        │
│  Registry) · Scaffolds conceituais (MCP, third-party, legacy)    │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. INGESTION                                                    │
│  IngestionAdapter (static_seed, local_contract_import,           │
│  snapshot_pull, api_pull, webhook_push, manual_registration)     │
│  → produz ProjectManifest institucional para cada fonte          │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. INSTITUTIONAL REGISTRY                                       │
│  Consolida todos os ProjectManifest em um registry único:        │
│  classification, trust, readiness, health, metrics, capabilities,│
│  branding, telemetry summary, mcp capabilities.                  │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. SURFACES                                                     │
│  Hub control plane (/projects, /health, /ecosystem,              │
│  /intelligence) · Superfície pública (/public) · APIs internas   │
│  de refresh/consulta                                             │
└──────────────────────────────────────────────────────────────────┘
```

## Duas camadas de contratos convivendo

A Matrizpoc agora possui **duas camadas de contratos públicos** em
`packages/integration/api-contracts`:

- **Contracts técnicos** (v1, pré-existentes): `AppManifestDTO`,
  `TelemetryEventDTO`, `GigSummaryDTO`, `EstablishmentSummaryDTO`,
  `ContractSummaryDTO`, `GoalSummaryDTO`, `ActivitySummaryDTO`,
  `RewardSummaryDTO`. **Não mudam.** Continuam sendo a interface técnica
  de comunicação entre apps.
- **Contracts institucionais** (v1/institutional, novos):
  `ProjectManifest`, `ProjectHealthSnapshot`, `ProjectPublicMetrics`,
  `ProjectTelemetrySummary`, `ProjectIntegrationCapabilities`,
  `ProjectBrandIdentity`, `ProjectMcpCapabilities`, `SourceClassification`.
  **Novos.** Descrevem qualquer projeto do ecossistema de forma uniforme,
  independente da origem.

As duas camadas coexistem e são re-exportadas em barreis separados:

```ts
// Técnico (como sempre foi)
import { AppManifestDTO, TelemetryEventDTO } from "@matriz/integration-api-contracts"

// Institucional (novo)
import { ProjectManifest, ProjectHealthSnapshot } from "@matriz/integration-api-contracts/v1/institutional"
```

## Fronteira clara

| Tema | Camada técnica (V1.1) | Camada institucional (V1.2) |
|---|---|---|
| Unidade | App do monorepo | Projeto do ecossistema |
| SoT | `apps/<x>/src/manifest/manifest.ts` | `ProjectManifest` derivado ou ingerido |
| Quem produz | O próprio app | `IngestionAdapter` |
| Quem consome | Outros apps (gateways), Hub | Hub control plane, superfície pública |
| Escopo | 5 apps do monorepo | N projetos internos + externos + simulados |
| Governança | L1–L12 arquiteturais | L1–L12 + classification + trust + readiness |

## Leituras relacionadas

- [project-intelligence-contracts.md](./project-intelligence-contracts.md)
- [source-classification.md](./source-classification.md)
- [ingestion-model.md](./ingestion-model.md)
- [telemetry-institutional-model.md](./telemetry-institutional-model.md)
- [public-site-automation-model.md](./public-site-automation-model.md)
- [theming-governance.md](./theming-governance.md)
- [cross-repo-integration-model.md](./cross-repo-integration-model.md)
- [mcp-capabilities-model.md](./mcp-capabilities-model.md)
- [wallet-future-notes.md](./wallet-future-notes.md)
- [circular-benefits-model.md](./circular-benefits-model.md)
- [migration-strategy-v1-to-real-products.md](./migration-strategy-v1-to-real-products.md)
- [audit/v1.2-institutional.md](./audit/v1.2-institutional.md)
