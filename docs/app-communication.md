# App Communication Map

> Como os apps conversam entre si sem se acoplar. Expandido em CP-5.

## Canais (L3)

1. **DTO público** — tipos em `packages/integration/api-contracts/v1`.
2. **Manifest** — `apps/<app>/public-contract.ts` (só leitura).
3. **Gateway/Connector** — um app consumidor chama outro via
   `src/integration/gateways/*Gateway.ts`.
4. **Evento** — `packages/integration/events` (bus).
5. **External link** — `packages/integration/external-links`.

## Fluxo Spot → Contracts → Hub

1. Spot cria uma `Gig` (use case).
2. User clica "gerar contrato".
3. Spot adapta `Gig` em `CreateContractFromGigInput` (DTO).
4. `ContractsGateway.create(input)` no Spot chama o app Contracts
   (HTTP ou in-browser bus).
5. Contracts cria `Contract` + external link apontando para a gig.
6. Contracts emite `contract.created`.
7. Hub consome `contract.created` e reflete na timeline.
8. Spot consome `contract.created` e atualiza a Gig com badge
   "contrato gerado".

## Fluxo Seumei → Contracts → Hub

Análogo, com `Establishment` → `CreateContractFromEstablishmentInput`.

## Anti-padrões

- Importar `Gig` de dentro do `contracts/` — proibido (L3).
- Copiar DTO de um app para outro — proibido (L7).
- Spot chamando Seumei diretamente — proibido; tem que passar pelo
  Hub ou por contrato oficial.
