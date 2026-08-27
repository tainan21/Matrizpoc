# Seumei

> App de dominio de **estabelecimentos, ofertas de servicos e donos**.
> Emite contratos para o app Contracts via event bus + adapter DDD->DTO.

---

## Dominio

| Entidade | Chave branded | Descricao |
|----------|---------------|-----------|
| `Establishment` | `EstablishmentId` | Bar, casa de shows, restaurante ou espaco. Tem `name`, `city`, `capacity`, `category`. |
| `ServiceOffering` | `ServiceOfferingId` | Oferta ativa de um estabelecimento (servicos, preco base, duracao). |
| `OwnerProfile` | `OwnerProfileId` | Dono/responsavel pelo estabelecimento. |
| `ServiceRequest` | `ServiceRequestId` | Requisicao de servico feita por um cliente a um estabelecimento. |

Todas isoladas por `tenantId`. Repositorios in-memory persistem em
`KeyValueStore` (shape ja espelha schema Prisma futuro — L5).

## Arquitetura (Clean)

```
app/                          # Next.js routes
  page.tsx                    # dashboard
  establishments/page.tsx
  establishments/EstablishmentActions.tsx   # "use client"
  owners/page.tsx
  onboarding/page.tsx
src/
  domain/
    models/index.ts
    repositories/index.ts
  application/use-cases.ts
  mock/{seeds,repositories}.ts
  integration/
    adapters/establishment-to-contract.adapter.ts   # L6
    gateways/contracts.gateway.ts                    # anti-corrupcao
  ui/components/{AppShell,BootstrapGuard}.tsx
  ui/presenters/establishment.presenter.ts
  bootstrap/index.ts          # L11
  lib/container.ts
public-contract.ts            # L2
```

## Integracoes

| Tipo | Detalhe |
|------|---------|
| Eventos produzidos | `seumei.establishment.selected`, `contract.created` |
| Eventos consumidos | `contract.created` (filtra `originApp === "seumei"`) |
| Adapter DDD->DTO | `establishmentToCreateContractInput(est, opts) -> CreateContractFromEstablishmentInputDTO` (v1) |
| Gateway | `SeumeiContractsGateway`: valida com Zod, emite eventos, cria `ExternalLink`, retorna `ContractSummaryDTO` |
| Telemetria | `TelemetryClient("seumei")` — tracka `seumei.establishment.selected` e `seumei.contract.confirmed` |
| Onboarding | Step proprio via `registerAppStep(asAppId("seumei"), { payloadSchema: appOnboardingPayloadSchemas.seumei })` |

## Fluxo cross-app (Seumei -> Contracts)

Identico ao fluxo Spot (ver `apps/spot/docs/README.md`), trocando `Gig` por
`Establishment` e `CreateContractFromGigInputDTO` por
`CreateContractFromEstablishmentInputDTO` v1.

## Regras (L3/L4)

- Comunica com Contracts **apenas** via eventos + DTOs v1 + `external-links`.
- `public-contract.ts` expoe apenas o manifest.

## Como rodar

```bash
pnpm --filter @matriz/app-seumei dev
pnpm --filter @matriz/app-seumei typecheck
```
