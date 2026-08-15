# App Ownership Map

Matriz consolidada de ownership (L9). Cada app declara o que expõe, o que
mantém privado e o que pode/não pode importar. Auth V1.1 foi adicionada
como dimensão de cada app: a estratégia padrão vive localmente em
`src/auth/`.

## Apps

### matriz-hub

- **Responsabilidade**: ponto de entrada, consolidador (catálogo,
  registry, events, external-links).
- **Expõe**: `apps/matriz-hub/public-contract.ts` → `{ manifest }`.
- **Não expõe**: `src/auth/**`, `src/domains/**`, `src/ui/**`,
  `src/bootstrap/**`, `src/manifest/**`.
- **Pode importar**: `packages/*`, `@apps/spot/public-contract`,
  `@apps/seumei/public-contract`, `@apps/contracts/public-contract`,
  `@apps/willdash/public-contract`.
- **Não pode importar**: qualquer `apps/<X>/src/**`.
- **Auth**: estratégia padrão = **magic link**. Adoção em
  `apps/matriz-hub/src/auth/`. Login em
  `apps/matriz-hub/src/domains/login/presentation/`.

### spot

- **Responsabilidade**: domínio bandas/gigs. Produz `spot.gig.created`
  e participa de `contract.created`.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: `src/domain`, `src/mock`, `src/state`, `src/application`,
  `src/ui`, `src/integration`, `src/auth`, `src/domains/login`.
- **Pode importar**: `packages/*`.
- **Não pode importar**: qualquer outro app via `src/**`.
- **Auth**: estratégia padrão = **OTP**. UI laranja via
  `appThemes.spot`.

### seumei

- **Responsabilidade**: domínio estabelecimentos. Produz
  `seumei.establishment.selected`.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: internals (`src/**` inteiro).
- **Pode importar**: `packages/*`.
- **Não pode importar**: outros apps via `src/**`.
- **Auth**: estratégia padrão = **OTP**. UI verde via
  `appThemes.seumei`.

### contracts

- **Responsabilidade**: contratos compartilháveis. Produz
  `contract.created` e `contract.linked`. **Não chama outros apps
  ativamente** — apenas recebe DTOs.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: entidades internas.
- **Pode importar**: `packages/*`.
- **Não pode importar**: outros apps via `src/**`. Recebe contexto
  exclusivamente via DTOs (`CreateContractFromGigInput`,
  `CreateContractFromEstablishmentInput`).
- **Auth**: estratégia padrão = **magic link**. UI neutra via
  `appThemes.contracts`.
- **Nota intencional**: sem `src/integration/gateways/` (L9) — o app
  recebe, não solicita.

### willdash

- **Responsabilidade**: metas, atividades, recompensas.
- **Expõe**: manifest via `public-contract.ts`.
- **Não expõe**: internals.
- **Pode importar**: `packages/*`.
- **Não pode importar**: outros apps via `src/**`.
- **Auth**: estratégia padrão = **magic link**. UI âmbar via
  `appThemes.willdash`.

## Packages (resumo)

Detalhe completo em cada `packages/*/README.md`. Regras gerais:

- `foundation/*` — só depende de si mesmo.
- `design/*` — não depende de `integration/*`, `flows/*`, `access/*`,
  nem de qualquer domínio.
- `platform/*` — pode depender de `foundation/*`. Não de `design/*`,
  `integration/*`, `flows/*`.
- `access/*` — pode depender de `foundation/*`, `platform/*`.
- `integration/*` — pode depender de `foundation/*`. Não de `design/*`.
- `flows/*` — pode depender de `design/*`, `integration/*`,
  `platform/*`, `access/*`, `foundation/*`.

### MatrizLib local

- `packages/design/system` is the local authority for tokens, declarative themes,
  public CSS, and metadata. `packages/design/ui` is the local authority for
  React primitives, component metadata, and Storybook.
- Both accept only domain-free visual contracts. They do not import apps,
  `integration/*`, `flows/*`, `access/*`, storage, or HTTP.
- Apps retain presenters, entities, copy, auth, routes, persistence, and local
  themes. They consume only public `@matriz/design-system` and
  `@matriz/design-ui` surfaces, never `packages/design/**/src/**`.
- The external library remains reference-only. Criteria and migration guidance
  are in `docs/matrizlib/`.

### Auth — regra especial (L12)

`packages/platform/auth`:

- **Pode importar**: `foundation/types`, `platform/storage`.
- **Não pode importar**: nenhum domínio de app, nenhum `design/*`
  (fica sem UI), nenhum `integration/*`.
- **Razão**: é o motor compartilhado; UI e domínio vivem por app
  (ver ADR 0001).
