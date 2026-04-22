# Spot

> App de dominio de **bandas, gigs e perfis artisticos**. Emite contratos
> para o app Contracts via event bus + adapter DDD->DTO.

---

## Dominio

| Entidade | Chave branded | Descricao |
|----------|---------------|-----------|
| `Band` | `BandId` | Grupo musical pertencente a um `TenantId`. |
| `Gig` | `GigId` | Show/apresentacao: `title`, `venue`, `city`, `scheduledFor`, `cacheAmount`, `status` (`draft \| published \| booked \| cancelled`). |
| `ArtistProfile` | `ArtistProfileId` | Perfil publico do artista/banda. |

Todas as entidades sao isoladas por `tenantId` (multi-tenant desde o
dominio). Repositorios in-memory em `src/mock/repositories.ts`, persistem em
`KeyValueStore` (plugavel com Prisma no futuro — shape ja espelha L5).

## Arquitetura (Clean)

```
app/                          # Next.js routes
  page.tsx                    # landing
  gigs/page.tsx               # /gigs (server)
  gigs/GigActions.tsx         # "use client" — dispara fluxo Spot->Contracts
  bands/page.tsx
  onboarding/page.tsx
src/
  domain/
    models/index.ts           # entidades + branded ids
    repositories/index.ts     # interfaces (L5)
  application/use-cases.ts    # listGigs, createGig, publishGig, etc.
  mock/
    seeds.ts                  # dados mock multi-tenant
    repositories.ts           # in-memory via KeyValueStore
  integration/
    adapters/                 # L6 — DDD -> DTO v1
    gateways/                 # anti-corrupcao (emite eventos + valida com Zod)
  ui/
    components/               # AppShell, BootstrapGuard
    presenters/               # L6 — Gig -> GigViewModel
  bootstrap/index.ts          # L11 — registra manifest + TelemetryClient
  lib/container.ts            # DI container (mocks)
public-contract.ts            # L2 — apenas manifest
```

## Integracoes

| Tipo | Detalhe |
|------|---------|
| Eventos produzidos | `spot.gig.created`, `contract.created` (indiretamente via gateway) |
| Eventos consumidos | `contract.created` (filtra `originApp === "spot"` para reagir) |
| Adapter DDD->DTO | `gigToCreateContractInput(gig, { bandName, counterpartyName }) -> CreateContractFromGigInputDTO` (v1) |
| Gateway | `SpotContractsGateway`: valida input com Zod, emite `spot.gig.created` + `contract.created`, cria `ExternalLink` no store global, retorna `ContractSummaryDTO` |
| Telemetria | `TelemetryClient("spot")` registrado no bootstrap; tracka eventos como `spot.gig.created` e `spot.contract.confirmed` |
| Onboarding | Step proprio via `registerAppStep(asAppId("spot"), { payloadSchema: appOnboardingPayloadSchemas.spot })` |

## Fluxo cross-app (Spot -> Contracts)

1. Usuario clica "Gerar contrato" em `/gigs` (`GigActions.tsx` client).
2. Use case local busca `Gig` + `Band`.
3. `gigToCreateContractInput()` converte para `CreateContractFromGigInputDTO` v1.
4. `SpotContractsGateway.createContractFromGig()`:
   - valida com Zod,
   - emite `spot.gig.created` e `contract.created` no event bus global,
   - cria `ExternalLink` (Spot/gig -> Contracts/contract) no store global,
   - retorna `ContractSummaryDTO`.
5. Bootstrap do Contracts observa `contract.created` e materializa no store local.
6. Bootstrap do WillDash observa `contract.created` e incrementa telemetria.

## Regras (L3/L4)

- **NAO PODE** importar `@apps/<qualquer-app>/src/**` ou `@apps/<qualquer-app>/app/**`.
- Comunica com Contracts **apenas** via eventos + DTOs v1 + `external-links`.
- `public-contract.ts` exporta apenas o manifest (nao expor entities).

## Como rodar

```bash
pnpm --filter @matriz/app-spot dev
pnpm --filter @matriz/app-spot typecheck
```
