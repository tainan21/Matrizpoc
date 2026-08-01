# Change Safety

## Superfícies de alto impacto

Mudanças em `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`,
`vitest.config.ts`, `tooling/` ou configs raiz afetam todo o monorepo e exigem
smoke tests e boundary tests.

Mudanças em `packages/integration/api-contracts`, manifests, eventos ou
contratos públicos exigem `pnpm test:smoke`.

## Ambiente

- Documente novas variáveis em `.env.example`; nunca versione `.env`.
- Não registre tokens, cookies, logs de execução ou conteúdo sensível.
- Apps locais devem falhar de forma explícita quando um segredo obrigatório
  estiver ausente.

## Git

Não commitar `.next`, `.turbo`, `node_modules`, logs, screenshots temporários,
artefatos de build ou arquivos `.env`.

## Packages

Proponha package compartilhado somente quando houver dois consumidores reais,
API estável e ausência de domínio forte. Implementação usada por um único app
permanece app-local.
