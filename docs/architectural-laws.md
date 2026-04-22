# Leis Arquiteturais da Matriz — V1

> Fonte canônica. Qualquer PR que viole uma destas leis é rejeitado.
> Ferramentas automáticas (ESLint, smoke tests, varreduras por CP) auditam
> a maior parte delas; o resto é revisão manual obrigatória.

Estas 12 leis foram travadas antes do CP-0 e se aplicam a todo o monorepo.

---

## L1. Schema por app é a unidade oficial de isolamento da V1

Os 5 schemas Prisma são:

- `prisma/schemas/core.prisma`
- `prisma/schemas/spot.prisma`
- `prisma/schemas/seumei.prisma`
- `prisma/schemas/contracts.prisma`
- `prisma/schemas/willdash.prisma`

Não fragmentamos schemas por subdomínio interno nesta V1. A unidade é o app.

---

## L2. Manifest: source of truth é o próprio app

Cada app declara seu manifest real em `apps/<app>/src/manifest/manifest.ts`.
**Essa é a única verdade.**

- `packages/integration/registry-core` **NÃO** contém manifests estáticos
  autoritativos.
- O Hub agrega manifests importando **diretamente de cada app** via
  `@apps/<app>/public-contract` (barrel manifest-only — ver L3).
- Não existe seed duplicado em nenhum package central.

---

## L3. Comunicação entre apps só por contrato oficial

Um app **NUNCA** importa internals (`domain/`, `application/`, `mock/`,
`state/`, `api/`, `ui/`) de outro app. Superfícies permitidas:

1. **DTOs públicos** em `packages/integration/api-contracts`
2. **Manifest** exposto pelo app em `apps/<app>/public-contract.ts`
3. **Gateway/Connector** em `apps/<consumidor>/src/integration/gateways`
4. **Eventos** via `packages/integration/events`
5. **External links** via `packages/integration/external-links`

---

## L4. Política de imports (dura, auditada por ESLint)

| De → Para | Permitido? |
|---|---|
| `apps/<X>` → `packages/*` | sim |
| `apps/<X>` → `apps/<Y>/src/**` | **não** |
| `apps/<X>` → `apps/<Y>/public-contract.ts` | sim (só manifest) |
| `packages/*` → `apps/*` | **não** |
| `packages/design/*` → `integration/*` ou `flows/*` | **não** |
| `packages/integration/*` → `packages/design/*` | **não** |
| `packages/flows/*` → `design/*` + `integration/*` | sim |
| `packages/foundation/*` → qualquer outro package | **não** |
| `src/domain/**` → `src/ui/**` | **não** |
| `src/ui/**` → `src/domain/**` | **não** (só via presenter — L6) |
| `src/ui/**` → `src/application/**` | sim |
| `src/application/**` → `src/domain/**` | sim |
| `src/application/**` → `src/integration/**` | sim |
| `src/integration/**` → `src/domain/**` | sim (para mapear) |
| package compartilhado → domínio forte de app | **não** (L12) |

Configurado em `tooling/eslint-config/index.js` via `no-restricted-imports`
e pattern matching.

---

## L5. Mocks seguem interface futura de repository real

- Componentes/hooks/telas **nunca** acessam seeds diretamente.
- Cada app define interfaces em `src/domain/repositories/`
  (ex.: `GigRepository`, `EstablishmentRepository`, `ContractRepository`).
- Implementações mock vivem em `src/mock/repositories/*` e usam
  `packages/platform/storage` (localStorage wrapper).
- Use cases dependem da **interface**, nunca da implementação concreta.
- Trocar para Prisma real = nova implementação em
  `src/integration/gateways/prisma/*` injetada no bootstrap. Zero
  impacto na UI.

---

## L6. UI consome ViewModel, nunca entity crua

- Em cada app: `src/ui/presenters/` contém funções
  `toXxxViewModel(entity) → XxxViewModel`.
- Componentes tipam props em cima de `ViewModel`, não de `Entity`.
- Páginas: use case → entity → presenter → ViewModel → render.
- Proteção: mudanças internas no domínio não quebram UI.

---

## L7. Contratos públicos já nascem preparados para versão

- Raiz versionada: `packages/integration/api-contracts/src/v1/`.
- Barrel `src/index.ts` re-exporta v1 como default e expõe namespace `v1`.
- Eventos carregam `version: "v1"` no envelope.
- Manifest tem campo `contractVersion`.
- DTOs críticos podem ser branded types para impedir substituição
  acidental entre versões.
- V2 futura conviverá em `src/v2/` e apps migram individualmente.

---

## L8. Smoke tests mínimos de contrato público (obrigatório)

Localização: `tests/smoke/` na raiz. Runner: **vitest**.

Cobertura mínima:

- `manifests.test.ts` — cada manifest real satisfaz `AppManifestDTO`
- `registry.test.ts` — registry carrega 5 apps, faz lookups
- `dtos.test.ts` — amostras válidas/inválidas dos DTOs principais
- `external-links.test.ts` — `createLink` + `findLinksFor`
- `events.test.ts` — emit/on/history/off dos 6 eventos obrigatórios

Rodam em `pnpm test:smoke`. PR que quebra smoke tests é bloqueado.

---

## L9. Ownership map explícito

Todo app e todo package principal declara em seu `README.md`:

- **Responsabilidade** (1 frase)
- **Expõe** (barrel + manifest)
- **Não expõe** (internals)
- **Pode importar** (lista)
- **Não pode importar** (lista)

O `docs/app-ownership-map.md` agrega tudo numa matriz única.

---

## L10. Feature flags mock por app/tenant

- `packages/platform/config` expõe
  `featureFlags: { [tenantId]: { [appId]: { [flag]: boolean } } }`.
- Helper `isFeatureEnabled(tenantId, appId, flag)`.
- Apps consomem flags em pontos-chave (ex.:
  `spot.booking-v2`, `seumei.delivery-zones-preview`,
  `contracts.auto-link-on-create`, `willdash.rewards`).
- Hub mostra estado das flags em `/feature-flags`.

---

## L11. Bootstrap por app — ponto único de entrada

Todo app tem `src/bootstrap/index.ts` que:

1. Registra o manifest do app no registry global.
2. Registra handlers de evento (`bus.on(...)`).
3. Registra a extensão de onboarding (`onboarding.registerAppStep(...)`).
4. Exporta providers/config consumidos pelo layout raiz.

`app/layout.tsx` chama `bootstrap()` em client provider uma única vez.

Fluxo do agente para entender um app:
`docs/AGENT-START-HERE.md` → `src/manifest/manifest.ts` → `src/bootstrap/index.ts`.

---

## L12. Packages compartilhados NÃO carregam domínio forte

Aceito em `packages/*`:

- base visual (design)
- contratos públicos (api-contracts)
- infra técnica leve (platform/*)
- fluxo compartilhável (flows/onboarding)
- contexto compartilhável (access/tenants, access/permissions)
- tipos/constants/utils (foundation/*)

**Rejeitado** em `packages/*`:

- regras de negócio de Spot, Seumei, Contracts ou WillDash
- entidades fortes desses domínios

Exceção controlada: `integration/api-contracts` pode **nomear**
entidades via DTO (`GigSummaryDTO`) — DTO é contrato, não regra.

Revisão ao fim de cada CP: varredura manual por palavras-chave
(`gig`, `establishment`, `contract`, `goal`) em `packages/*`. Só podem
aparecer em `api-contracts` e em docs.
