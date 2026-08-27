# Matriz Project Factory

## Fonte de verdade

`packages/platform/config/src/index.ts` declara `localAppRuntimes`, a fonte
canônica de slug local, appId, diretório, host, porta preferencial, health path,
lifecycle e adapter de runtime. Identidade de produto, rotas e capabilities
continuam pertencendo ao manifest de cada app. Nome e scripts do package
continuam pertencendo ao `package.json` do app.

O loader em `tooling/project-factory/catalog-loader.ts` verifica essas três
fontes antes de executar qualquer comando.

## Comandos

```text
pnpm dev:hub
pnpm dev:spot
pnpm dev:seumei
pnpm dev:contracts
pnpm dev:willdash
pnpm dev:workbench
pnpm dev:sites

pnpm app info <slug>
pnpm app dev <slug>
pnpm app create <blueprint.json> --preview
pnpm app create <blueprint.json> --apply
pnpm app import <source> --slug <slug> --snapshot <id> --preview
pnpm app import <source> --slug <slug> --snapshot <id> --apply
```

`dev` inicia somente o diretório selecionado. A porta preferencial é estrita:
se estiver ocupada, nenhum processo é criado. O host local canônico é
`127.0.0.1`. Cada app expõe `/api/health` com `status`, `appId` e
`contractVersion`. No Windows, o launcher evita shell intermediário e encerra a
árvore iniciada com `taskkill /T`.

## Criar

O blueprint de criação contém versão, operação, classificação, slug, nome,
owner, bounded context e porta. `--preview` calcula paths, hashes e conflitos
sem escrever. `--apply` executa somente um plano sem conflitos. Arquivos
idênticos são ignorados; arquivos divergentes bloqueiam toda a aplicação.

O scaffold cria apenas contrato, manifest, bootstrap, health, shell Next e
documentação mínima. Camadas de domínio nascem com o primeiro caso de uso.

## Importar

Importações entram em `migration-staging/<slug>/<snapshot-id>`, fora do
workspace pnpm e ignorado pelo Git. Inventário não executa scripts da origem e
rejeita links simbólicos. `.git`, dependências, builds, caches, coverage, logs
e arquivos `.env*` são excluídos; `.env.example` é permitido.

A origem permanece intacta. A cópia verifica novamente o hash imediatamente
antes de cada escrita e nunca sobrescreve conteúdo divergente.

## Migrações longas

O Workbench modela as fases `registration`, `staging`, `isolated-runtime`,
`adaptation`, `parity`, `shadow`, `cutover`, `retirement` e `closed`. A fonte
legada permanece autoritativa até cutover. Cutover exige aprovação humana e
evidências de paridade, dados, auth, contratos, observabilidade e rollback.

## Validação

```text
pnpm test:factory
pnpm test:smoke
pnpm --filter <package> lint
pnpm --filter <package> typecheck
pnpm tsx tooling/scripts/verify-app-boundaries.ts <app>
```

Mudanças no catálogo, contratos, manifests, tooling ou configuração raiz são
globais e exigem smoke e boundary checks.
