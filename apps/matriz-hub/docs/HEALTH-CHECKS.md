# MyHub Health Checks

## Responsabilidade

Os health checks são uma capability operacional local do MyHub. A implementação
fica em `src/domains/health-checks` porque apenas o Hub descobre, executa e
apresenta essas verificações. Nenhum domínio foi movido para package compartilhado.

## Fontes de verdade

- páginas: `manifest.routes` dos apps registrados por `bootstrapMatrizHub()`;
- apps, nomes e base URLs locais: registry global existente;
- APIs: descoberta transitória de `apps/<app>/app/api/**/route.ts` apenas para
  apps registrados;
- ambientes adicionais: `MYHUB_HEALTH_PROFILES_JSON`, validado no servidor.

Não existe catálogo persistente paralelo. Uma alteração de manifest ou de uma
Route Handler aparece automaticamente na execução seguinte.

## Uso

```bash
pnpm --filter @matriz/app-matriz-hub check:routes
pnpm --filter @matriz/app-matriz-hub check:apis
pnpm --filter @matriz/app-matriz-hub check:routes -- --environment preview
```

A interface fica em `/health/checks`. O Route Check usa `GET`. O API Check usa
`GET` somente em endpoints estáticos que declaram leitura; endpoints dinâmicos
ou mutáveis recebem `OPTIONS`, sem executar mutações nem inventar payloads.

Cada execução percorre todos os alvos e classifica `endpoint_not_found`,
`server_error`, `unauthorized`, `forbidden`, `method_not_allowed`,
`unexpected_response`, `timeout` e `network_error`. O CLI só define exit code 1
depois de imprimir o relatório consolidado e todas as falhas.

## Persistência e evolução

O último resultado de cada tipo/ambiente é gravado em
`.runtime/myhub-health-checks/<ambiente>/<tipo>.latest.json`. O caminho é fixo,
ignorado pelo Git e não aceita input de diretório vindo do cliente. Se o
filesystem estiver read-only, a execução ainda retorna o resultado e apresenta
um warning de persistência.

`HealthCheckResultRepository` é a porta estável para a próxima evolução. Um
futuro adapter Prisma deve implementar apenas `save` e `getLatest`, mantendo o
runner, os scripts, os presenters e a UI intactos. Antes dessa troca, o próximo
agente deve definir retenção, tenancy e política de limpeza; não criar uma tabela
apenas para replicar o arquivo atual.

## Validação

```bash
pnpm --filter @matriz/app-matriz-hub test
pnpm --filter @matriz/app-matriz-hub typecheck
pnpm --filter @matriz/app-matriz-hub lint
pnpm test:smoke
pnpm build
```

O build raiz deve ser executado sem servidores Next usando as mesmas pastas
`.next`. Resultados, logs, `.runtime`, `.next` e caches nunca devem ser commitados.
