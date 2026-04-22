# Contracts

> App de dominio de **contratos**. Consumidor principal do fluxo cross-app:
> escuta `contract.created` de Spot/Seumei via event bus e materializa os
> contratos no proprio store. Tambem permite criacao manual.

---

## Dominio

| Entidade | Chave branded | Descricao |
|----------|---------------|-----------|
| `Contract` | `ContractId` | Contrato com `status` (`draft \| signed \| cancelled`), `originApp` (`spot \| seumei \| manual`), `idempotencyKey`, valor em `BRL` e `bandName` + `counterpartyName`. |

Ao receber `contract.created` do bus, deduplica por `idempotencyKey` antes
de criar o registro local.

## Arquitetura (Clean)

```
app/
  page.tsx                    # dashboard
  contracts/page.tsx          # /contracts
  templates/page.tsx
  onboarding/page.tsx
src/
  domain/models/index.ts
  domain/repositories/index.ts
  application/use-cases.ts    # listContracts, createContract, fromGigInput, fromEstablishmentInput, markAsSigned
  mock/{seeds,repositories}.ts
  integration/adapters/
    input-to-contract.adapter.ts   # L6 — DTO v1 -> Contract (entrada anti-corrupcao)
  ui/components/{AppShell,BootstrapGuard}.tsx
  ui/presenters/contract.presenter.ts
  bootstrap/index.ts          # L11 — ouve contract.created do bus
  lib/container.ts
public-contract.ts            # L2
```

## Integracoes

| Tipo | Detalhe |
|------|---------|
| Eventos produzidos | `contract.linked`, `contract.pdf.generated` (futuro) |
| Eventos consumidos | `contract.created` (de qualquer `originApp`) |
| Adapter DTO->DDD | `createContractFromGigInput(dto) -> Contract` e `createContractFromEstablishmentInput(dto) -> Contract` |
| Telemetria | `TelemetryClient("contracts")` tracka `contract.created` e `contract.linked` |
| Onboarding | Step proprio via `registerAppStep(asAppId("contracts"))` |

## Fluxo de entrada

1. Bootstrap subscreve `bus.on("contract.created", ...)`.
2. Handler deduplica por `idempotencyKey` e chama `fromGigInput`/`fromEstablishmentInput` conforme `originApp`.
3. Adapter L6 converte o DTO v1 em entidade `Contract` local (isolamento do dominio).
4. Repositorio persiste no `KeyValueStore` (future Prisma).
5. Telemetria e emitida.

## Regras (L3/L4)

- **NAO IMPORTA** entities de Spot/Seumei — apenas DTOs v1 publicos de
  `@matriz/integration-api-contracts`.
- `public-contract.ts` expoe apenas o manifest.

## Como rodar

```bash
pnpm --filter @matriz/app-contracts dev
pnpm --filter @matriz/app-contracts typecheck
```
