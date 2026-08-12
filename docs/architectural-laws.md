# Leis Arquiteturais da Matriz — V1

> Fonte canônica. Qualquer PR que viole uma destas leis é rejeitado.
> Ferramentas automáticas (ESLint, smoke tests e verificadores de boundaries)
> auditam parte delas; o restante exige revisão manual.

## Como ler esta baseline

- **Estado atual** descreve artefatos que existem neste repositório em
  2026-08-05. Isso não prova que exista infraestrutura implantada.
- **Alvo aprovado** descreve a arquitetura a ser entregue pelas ondas do
  programa Matriz. Não deve ser apresentado como funcionalidade disponível.

As 12 leis da V1 continuam válidas. Os detalhes de banco, identidade,
autorização e integração distribuída abaixo fixam o alvo aprovado sem antecipar
sua implementação.

---

## L1. Schema por app é a unidade oficial de isolamento da V1

### Estado atual

Existem sete apps no monorepo:

- `matriz-hub`
- `matriz-workbench`
- `spot`
- `seumei`
- `contracts`
- `willdash`
- `sites`

O repositório contém seis fontes Prisma independentes em
`prisma/<schema>/schema.prisma`, para `core`, `hub`, `spot`, `seumei`,
`contracts` e `willdash`, cada qual com migrations versionadas ao lado. A
presença desses arquivos não significa que a topologia
central, as migrations independentes, os roles ou o RLS já estejam entregues.

O Matriz Workbench permanece file-backed, com estado canônico em `.matriz/**`
versionado pelo Git. Matriz Sites permanece file/config-backed. Nenhum dos dois
recebe schema vazio apenas para uniformizar o monorepo.

### Alvo aprovado — Onda 2

- Uma única instância física de PostgreSQL gerenciado no Neon abrigará os
  schemas lógicos `core`, `hub`, `spot`, `seumei`, `contracts` e `willdash`.
- Cada app com banco será dono de seu schema, de suas migrations e de seu role
  de runtime. Credenciais/roles de migration e de runtime serão separados e
  terão privilégio mínimo.
- `matriz-identity` será o oitavo serviço/app. Ele ainda não existe. Será dono
  do provedor OIDC e dos dados centrais de identidade em `core`. Serviços Core
  centrais/compartilhados, como ExternalLinks, terão owner e contrato públicos
  próprios. Seus registros operacionais permanecem tenant-owned; isso não os
  adiciona à whitelist global nem desloca domínio de produto para o Core.
- `matriz-hub`, `spot`, `seumei`, `contracts` e `willdash` serão donos dos
  schemas homônimos. Nenhum app acessará tabelas internas de outro schema.
- Integridade multi-tenant nascerá na primeira entrega de banco: chaves e
  índices tenant-first, unicidades compostas por tenant e FKs compostas como
  `[tenantId, parentId]`. RLS e roles restritivos são obrigatórios desde essa
  baseline; não são endurecimento opcional posterior.
- FKs entre schemas de apps são proibidas. Integrações usam IDs opacos,
  contratos públicos, APIs e eventos.

### Ownership global e por tenant — alvo aprovado

A whitelist global é fechada:

- `User`;
- credenciais e desafios de autenticação;
- clientes OIDC;
- catálogo institucional global.

Todo dado operacional é tenant-owned. O catálogo global pode receber overlays
tenant-scoped, sem transformar o overlay em dado global.

O modelo de acesso é:

- `User`: identidade humana global, sem papel operacional implícito;
- `TenantMembership`: vínculo `User` ↔ tenant e papéis organizacionais naquele
  tenant;
- `AppGrant`: vínculo `TenantMembership` ↔ app, com papéis e capabilities
  específicos do app.

Nenhum papel em `TenantMembership` concede acesso automático a todos os apps;
o `AppGrant` é explícito, revogável e auditável.

### `AuthorizationContext` server-only — alvo aprovado

Cada request autenticado será reduzido no servidor a um contexto imutável com:

```ts
type AuthorizationContext = {
  userId: string
  tenantId: string
  appId: string
  membershipId: string
  tenantRoles: readonly string[]
  appRoles: readonly string[]
  capabilities: readonly string[]
  sessionId: string
  traceId: string
}
```

O servidor deriva esse contexto da sessão/token validado, da membership ativa e
do grant do app. `tenantId`, roles, capabilities e identidade enviados em body,
query string ou header público nunca são fonte de autoridade. Se aparecerem em
um contrato de dados, são apenas dados a conferir contra o contexto e qualquer
divergência é negada.

---

## L2. Manifest: source of truth é o próprio app

Cada app existente declara seu manifest real em
`apps/<app>/src/manifest/manifest.ts`. **Essa é a única verdade.**

- `packages/integration/registry-core` não contém manifests estáticos
  autoritativos.
- O Hub agrega manifests importando diretamente de cada app por
  `@apps/<app>/public-contract` (barrel manifest-only — L3).
- Não existe seed duplicado em package central.
- O app planejado `matriz-identity` só entra no inventário atual depois de
  existir com manifest e contrato público válidos.

---

## L3. Comunicação entre apps só por contrato oficial

Um app **nunca** importa internals (`domain/`, `application/`, `mock/`,
`state/`, `api/`, `ui/` ou qualquer outro caminho sob `src/**`/`app/**`) de
outro app. Superfícies permitidas:

1. DTOs públicos em `packages/integration/api-contracts`;
2. manifest em `apps/<app>/public-contract.ts`;
3. gateway/connector app-local em
   `apps/<consumidor>/src/integration/gateways`;
4. eventos contratados em `packages/integration/events`;
5. ExternalLinks por contrato oficial.

### Estado atual: dívida de autoridade da POC

O estado atual usa transports de POC, inclusive bus em memória e gateways
simulados. Em superfícies Hub/MatrizDocs, a POC ainda aceita tenant e actor por
headers públicos. Seus helpers de flags também não têm `TenantMembership` nem
`AppGrant` reais para autorizar o acesso. Isso é uma dívida crítica da Onda 1,
endereçada pelos itens 7–9 do programa, e não uma implementação parcial da
política alvo.

### Regra do alvo aprovado

O alvo distribuído usa HTTP autenticado e outbox/inbox durável, conforme
`docs/app-communication.md`. O servidor constrói o contexto de autorização,
nega por padrão e só autoriza após validar membership, app grant e capability.
Tenant, actor, roles ou capabilities de payload, query string ou header público
nunca conferem autoridade.

---

## L4. Política de imports é dura e auditada

| De → Para | Permitido? |
| --- | --- |
| `apps/<X>` → `packages/*` | sim |
| `apps/<X>` → `apps/<Y>/src/**` | **não** |
| `apps/<X>` → `apps/<Y>/app/**` | **não** |
| `apps/<X>` → `apps/<Y>/public-contract.ts` | sim, apenas manifest |
| `packages/*` → `apps/*` | **não** |
| `packages/design/*` → `integration/*` ou `flows/*` | **não** |
| `packages/integration/*` → `packages/design/*` | **não** |
| `packages/flows/*` → `design/*` + `integration/*` | sim |
| `packages/foundation/*` → qualquer outro package | **não** |
| `src/domain/**` → `src/ui/**` | **não** |
| `src/ui/**` → `src/domain/**` | **não**, somente via presenter — L6 |
| `src/ui/**` → `src/application/**` | sim |
| `src/application/**` → `src/domain/**` | sim |
| `src/application/**` → `src/integration/**` | sim |
| `src/integration/**` → `src/domain/**` | sim, para mapear |
| package compartilhado → domínio forte de app | **não** — L12 |

A política é verificada por ESLint e por
`tooling/scripts/verify-app-boundaries.ts`.

---

## L5. Mocks seguem a interface do repository real

- Componentes, hooks e telas nunca acessam seeds diretamente.
- Cada app define interfaces em sua camada de domínio ou em ports app-local.
- Implementações mock vivem no app e respeitam a mesma interface da futura
  implementação persistente.
- Use cases dependem da interface, nunca da implementação concreta.
- A troca para Prisma adiciona um adapter no app e o injeta no bootstrap; não
  move repository de domínio para package compartilhado.

Mocks e transports em memória são estado atual de demonstração, não evidência
da persistência alvo.

---

## L6. UI consome ViewModel, nunca entity crua

- Cada app mantém presenters que convertem entity em ViewModel.
- Componentes tipam props por ViewModel, não por entity.
- O fluxo é use case → entity → presenter → ViewModel → render.
- A UI não consulta repositories nem serializa entidades de domínio de outro
  app.

---

## L7. Contratos públicos nascem preparados para versão

- A raiz atual é `packages/integration/api-contracts/src/v1/`.
- O barrel expõe v1 sem apagar o namespace versionado.
- O envelope de eventos atual carrega `version: "v1"`.
- O manifest possui `contractVersion`.
- Uma versão nova convive com a anterior; produtores e consumidores migram de
  forma independente e com janela explícita de depreciação.
- `MatrizEventEnvelopeV2` é alvo aprovado da Onda 3 e não substitui v1 antes de
  existirem adapters, compatibilidade e testes dos dois lados.

---

## L8. Smoke tests mínimos de contrato público são obrigatórios

Os smoke tests atuais vivem em `tests/smoke/` e rodam por
`pnpm test:smoke`. A cobertura inclui manifests, registry, DTOs, ExternalLinks,
eventos e boundaries públicos.

Mudanças em manifests, eventos, contratos, schemas ou leis exigem os gates
adicionais definidos em `docs/CHANGE-SAFETY.md`; um teste de prose inventado não
substitui verificação real de paths, links e contratos.

---

## L9. Ownership map é explícito

Todo app e todo package principal declara em seu `README.md`:

- responsabilidade;
- superfície exposta;
- internals não expostos;
- imports permitidos;
- imports proibidos.

`docs/app-ownership-map.md` agrega a matriz. Ownership de dados, migrations,
eventos e contratos deve ter um único app responsável.

---

## L10. Feature flags são tenant/app-scoped

### Estado atual: helpers de demonstração

O estado atual usa flags mock por tenant/app. Esses helpers não possuem
`TenantMembership` ou `AppGrant` reais e não podem ser descritos como controle
de permissão. A autoridade por headers públicos nas superfícies Hub/MatrizDocs
é a mesma dívida crítica dos itens 7–9 da Onda 1.

### Regra do alvo aprovado

Nenhuma flag concede permissão: a autorização depende de membership, grant e
capability verificados no `AuthorizationContext` server-only. O catálogo
institucional pode ser global, mas customizações e flags de operação são
overlays tenant-scoped. Uma leitura sem tenant explícito no contexto não pode
retornar overlay operacional.

---

## L11. Bootstrap por app é o único ponto de composição

Todo app existente tem `src/bootstrap/index.ts`, responsável por compor as
dependências autorizadas do app. O bootstrap pode registrar manifest, handlers,
onboarding e providers; módulos internos não se compõem por imports clandestinos
entre implementações.

Fluxo do agente para entender um app:
`docs/AGENT-START-HERE.md` → `README.md` →
`src/manifest/manifest.ts` → `src/bootstrap/index.ts`.

---

## L12. Packages compartilhados não carregam domínio forte

Aceito em `packages/*`:

- base visual;
- contratos públicos;
- infraestrutura técnica neutra;
- fluxos realmente compartilháveis;
- contextos de acesso sem regra de produto;
- tipos, constantes e utilitários.

Rejeitado em `packages/*`:

- regras, entities ou repositories de Spot, Seumei, Contracts, WillDash, Hub
  ou qualquer outro produto;
- abstrações promovidas com apenas um consumidor;
- acesso a internals de app.

`packages/integration/api-contracts` pode nomear DTOs de domínio porque contrato
não é implementação de regra. Extração compartilhada só ocorre depois de dois
consumidores reais, superfície estável e sem domínio forte, e redução mensurável
de manutenção. A implementação nasce app-local e é extraída depois.
