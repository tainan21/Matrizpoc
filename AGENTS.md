# AGENTS.md

## Objective
Work safely inside the Matriz monorepo without breaking architectural boundaries.

## Read order
Before changing anything, read in this order:

1. `docs/architectural-laws.md`
2. `docs/monorepo-structure.md`
3. `docs/app-communication.md`
4. `docs/desktop-application-architecture.md` when desktop runtime, packaging,
   distribution or migration is in scope
5. `docs/release-distribution.md` whenever downloads, installers, versions,
   packaging, updates or releases are in scope
6. the target app `docs/AGENT-START-HERE.md`
7. the target app `README.md`
8. the target app `src/manifest/manifest.ts`
9. the target app `src/bootstrap/index.ts`

## Scope rule
Always work in the smallest possible scope.

- If the task is app-specific, work only inside `apps/<target-app>`.
- Do not scan or refactor the full repo unless explicitly required.
- Do not create shared packages early.

## Hard architectural rules
- Never import `apps/<other-app>/src/**`
- Never import `apps/<other-app>/app/**`
- Only import another app through its `public-contract.ts` when allowed
- Shared packages must not contain strong product domain logic
- UI must consume view models, not raw domain entities
- Prefer app-local implementation first, shared extraction later

## Shared package rule
Only move code to `packages/*` when all are true:

- it is used by 2 or more apps
- it does not carry strong domain semantics from one app
- it has a stable public surface
- it reduces real maintenance cost

Otherwise, keep it inside the app.

## App-first migration rule
When migrating an external app into this monorepo:

1. make it run inside `apps/<app>`
2. adapt auth, env, design system and bootstrap
3. keep business rules local
4. refactor shared code only after stabilization

## Desktop runtime rule

- New desktop applications assume Tauri by default.
- Electron requires an explicit exception recorded according to
  `docs/desktop-application-architecture.md`.
- Investigate the current app, active documentation and relevant history before
  introducing or replacing a desktop framework.
- Old branches and worktrees are evidence, not architectural authority.
- Port small, understood changes; do not merge large branches merely because
  they contain newer code.
- Keep migrations reversible and update architecture documentation with the
  decision.

## Validation
Prefer scoped validation:

- `pnpm --filter <target> dev`
- `pnpm --filter <target> lint`
- `pnpm --filter <target> typecheck`

Run global checks only when touching root config, shared contracts, manifests, events, tooling or shared packages.

## Forbidden behavior
- Do not move business logic to shared packages without justification
- Do not rewrite unrelated apps
- Do not change root config casually
- Do not commit secrets, `.env`, logs, build outputs or cache artifacts

## Output style
When proposing changes:

- explain touched scope
- explain why the code belongs in app or package
- state risks to boundaries
- keep implementation incremental
leia primeiro docs/architectural-laws.md
nunca importe apps/<Y>/src/**
nunca mova domínio de app para package compartilhado
sempre trabalhe por escopo
comandos padrão de validação
como propor package novo
como editar env
o que é proibido commitar
2. apps/<app>/AGENTS.md

Função: instruções táticas do app.

Conteúdo:

rotas principais
fluxo de domínio
camada correta para cada mudança
presenters obrigatórios
mocks/repositories
contratos públicos do app
checklists antes de PR
3. packages/<grupo>/<pacote>/AGENTS.md

Função: impedir package pollution.

Conteúdo:

responsabilidade do package
imports permitidos
imports proibidos
o que NÃO é responsabilidade dele
exemplos de contribuições aceitas/rejeitadas
4. docs/DECISION-LOG.md

Curto e brutal:

decisão
motivo
impacto
quando revisar
5. docs/CHANGE-SAFETY.md

Para Codex:

mexer em root config exige cautela
mexer em tooling/, turbo.json, pnpm-workspace.yaml, tsconfig impacta geral
mexer em packages/integration/api-contracts exige smoke tests
