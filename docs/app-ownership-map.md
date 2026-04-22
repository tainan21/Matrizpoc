# App Ownership Map

> Matriz consolidada de ownership (L9). Cada app e cada package
> principal declara expõe/não expõe/pode importar/não pode importar.
> Esqueleto; preenchido por completo em CP-6.

## Apps

### matriz-hub

- **Responsabilidade**: tela inicial, catálogo, registry/events/links explorers.
- **Expõe**: `apps/matriz-hub/public-contract.ts` → `{ manifest }`.
- **Não expõe**: nada de `src/**` para outros apps.
- **Pode importar**: `packages/*`, `@apps/spot/public-contract`,
  `@apps/seumei/public-contract`, `@apps/contracts/public-contract`,
  `@apps/willdash/public-contract`.
- **Não pode importar**: qualquer `apps/<X>/src/**`.

### spot

- **Responsabilidade**: domínio bandas/gigs, produz `spot.gig.created`,
  consome `contracts.contract.created`.
- **Expõe**: `apps/spot/public-contract.ts` → `{ manifest }`.
- **Não expõe**: `src/domain`, `src/mock`, `src/state`, `src/application`,
  `src/ui`, `src/integration`.
- **Pode importar**: `packages/*`.
- **Não pode importar**: qualquer outro app via `src/**`.

### seumei

- **Responsabilidade**: domínio estabelecimentos, produz
  `seumei.establishment.selected`.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: internals.
- **Pode importar**: `packages/*`.
- **Não pode importar**: outros apps via `src/**`.

### contracts

- **Responsabilidade**: domínio contratos compartilháveis, produz
  `contract.created` e `contract.linked`.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: entidades internas.
- **Pode importar**: `packages/*`.
- **Não pode importar**: outros apps via `src/**`. Recebe contexto só
  via DTOs (`CreateContractFromGigInput`, `CreateContractFromEstablishmentInput`).

### willdash

- **Responsabilidade**: domínio metas/recompensas, prova expansão.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: internals.
- **Pode importar**: `packages/*`.
- **Não pode importar**: outros apps via `src/**`.

## Packages (resumo)

Detalhe completo em cada `packages/*/README.md`. Regras gerais:

- `foundation/*` — só depende de dentro do próprio sub-package.
- `design/*` — não depende de `integration/*`, `flows/*`, `access/*`, regras.
- `platform/*` — pode depender de `foundation/*`. Não de `design/*`,
  `integration/*`, `flows/*`.
- `access/*` — pode depender de `foundation/*`, `platform/*`.
- `integration/*` — pode depender de `foundation/*`. Não de `design/*`.
- `flows/*` — pode depender de `design/*`, `integration/*`, `platform/*`,
  `access/*`, `foundation/*`.
