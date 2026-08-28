# Matriz Infra Hub — guia técnico e operacional

## 1. Propósito

O Matriz Infra Hub é a base de integração de múltiplos produtos. Ele organiza
apps autônomos, packages técnicos reutilizáveis, contratos públicos e tooling
comum sem transformar o monorepo em um domínio único e acoplado.

Princípio central:

> Antes de criar, procure o que já existe. Antes de compartilhar, prove reuso
> real. Ao criar algo novo, desenhe uma superfície pequena que possa evoluir.

## 2. Estado atual e direção

### Implementado

- workspace pnpm e Turborepo;
- apps Next.js/React/TypeScript independentes;
- packages organizados por responsabilidade;
- manifests, contratos versionados, eventos e links externos;
- schemas Prisma isolados por app quando há banco;
- Workbench local-first com roadmap, backlog, docs, Codex e MCP;
- lint, typecheck, builds e smoke tests.

### Direção planejada

- experiência mobile-first responsiva em apps web;
- PWA quando instalação web, offline ou notificações justificarem o custo;
- React Native para experiências realmente nativas e distribuição em lojas;
- Tauri como padrão para novas aplicações e edições desktop;
- Electron apenas como exceção arquitetural documentada quando requisitos
  concretos dependerem materialmente de Chromium, Node ou browser automation;
- adapters cloud e colaboração remota opcionais;
- múltiplos repositórios conectados por contratos, sem imports cruzados.

React Native e PWA continuam dependentes do caso de uso. Uma aplicação web ou
serviço não recebe desktop por uniformidade; quando uma edição desktop é
necessária, a avaliação começa por Tauri. A política, o processo de exceção e
as regras de migração estão em `docs/desktop-application-architecture.md`.

## 3. Modelo arquitetural

Cada produto preserva domínio, casos de uso, integração e apresentação:

```text
apps/<app>/
├── app/                  # rotas Next.js e composição
├── src/
│   ├── domain/           # entidades, invariantes e portas
│   ├── application/      # casos de uso e orquestração
│   ├── integration/      # adapters, gateways e persistência
│   ├── ui/               # presenters, view models e componentes
│   ├── manifest/         # contrato de descoberta
│   └── bootstrap/        # composição do app
├── docs/
├── .matriz/              # estado operacional do Workbench
├── AGENTS.md
├── public-contract.ts
└── package.json
```

### DDD

- bounded context é o app ou um domínio explicitamente delimitado;
- linguagem de negócio forte permanece no app;
- DTO não é entidade de domínio;
- integração usa tradução por gateway/adapter;
- nem toda feature precisa de agregados, repositories e factories.

### SOLID

- responsabilidade única orienta módulos e casos de uso;
- dependências apontam para portas quando existe troca real de adapter;
- interfaces pequenas representam capacidades necessárias;
- abstração prematura não é considerada arquitetura;
- substituição precisa ser validada por contrato, não presumida.

### Packages

Extraia para `packages/*` apenas quando:

1. existem dois consumidores reais;
2. não há semântica forte de um produto;
3. a superfície pública está estável;
4. a extração reduz custo mensurável.

Componentes podem começar locais. Tokens e primitives comprovadamente
compartilhados pertencem a `packages/design`; regras de negócio, não.

## 4. Estrutura da raiz

| Caminho | Responsabilidade |
| --- | --- |
| `apps/*` | produtos e ferramentas executáveis |
| `packages/design/*` | UI, tokens e sistema visual |
| `packages/foundation/*` | tipos e utilidades sem dependências superiores |
| `packages/platform/*` | capacidades técnicas de plataforma |
| `packages/access/*` | tenants e permissões |
| `packages/integration/*` | DTOs, eventos, manifests e registry |
| `packages/flows/*` | fluxos compartilháveis comprovados |
| `prisma/schemas/*` | schema isolado por app |
| `tooling/*` | ESLint, TypeScript e testes |
| `tests/smoke/*` | contratos globais |
| `docs/*` | arquitetura e operação do ecossistema |

## 5. Instalação

Requisitos atuais:

- Node.js 22;
- pnpm 9, conforme `packageManager`;
- Git;
- PowerShell no fluxo Windows documentado.

```powershell
git clone <repositorio>
cd matriz-infra-hub
pnpm --version
pnpm install --frozen-lockfile
pnpm test:smoke
```

O resultado esperado de `pnpm --version` é o valor declarado no
`package.json`. Não apague `node_modules` para corrigir um launcher do pnpm
quebrado; primeiro valide o runtime em `%LOCALAPPDATA%\pnpm\.tools`.

## 6. Scripts da raiz

| Script | Uso |
| --- | --- |
| `pnpm dev` | inicia apps via Turbo |
| `pnpm build` | executa builds dos workspaces |
| `pnpm lint` | lint global |
| `pnpm typecheck` | tipagem global |
| `pnpm test:smoke` | contratos entre apps/packages |
| `pnpm prisma:validate` | valida schemas Prisma |
| `pnpm prisma:generate` | gera clients configurados |
| `pnpm demo:flows` | demonstra fluxos integrados |
| `pnpm demo:docs` | popula demonstração documental |
| `pnpm format` | formatação explícita; não usar em mudanças pequenas |

Prefira execução filtrada durante desenvolvimento:

```powershell
pnpm --filter @matriz/app-matriz-workbench dev
pnpm --filter @matriz/app-matriz-workbench lint
pnpm --filter @matriz/app-matriz-workbench typecheck
pnpm --filter @matriz/app-matriz-workbench test
```

## 7. Comunicação e dados

Apps não importam internals de outros apps. Comunicação aceita:

1. DTO público versionado;
2. manifest via `public-contract.ts`;
3. gateway/connector do consumidor;
4. evento;
5. link externo.

Multi-tenancy exige escopo explícito no contrato, autorização no caso de uso,
índices coerentes e testes contra vazamento entre tenants. O Workbench é
file-backed e não cria schema Prisma vazio.

## 8. Frontend multiplataforma

- Server Components são o padrão em Next.js;
- Client Components ficam restritos à interação;
- UI consome ViewModels produzidos por presenters;
- mobile-first significa priorizar conteúdo e interação, não apenas reduzir
  largura;
- PWA compartilha o app web, mas exige estratégia de cache e atualização;
- React Native compartilha contratos, tokens e lógica realmente portátil, não
  componentes DOM;
- Tauri pode reutilizar frontend web, mas integrações nativas ficam atrás de
  ports/adapters;
- Electron existente é preservado até avaliação app-local; sua existência não
  cria precedente para novos apps.

O design system deve compartilhar semântica — cores, espaçamento, tipografia,
estados e acessibilidade — sem fingir que DOM, React Native e desktop possuem
os mesmos componentes.

## 9. Workbench

O Workbench descobre automaticamente:

- cada `apps/*/package.json`;
- o projeto-raiz `matriz-infra-hub`;
- README, scripts, tecnologias, pastas e instruções de agente;
- `.matriz/**`, quando inicializado.

O Workbench não executa TypeScript de outro app e não escreve em `src/**`.
Mutações do navegador ficam dentro do `.matriz` do projeto selecionado.

Cada projeto pode manter:

- fases e iniciativas;
- uma trilha histórica geral;
- trilhas 0–100 especializadas;
- backlog;
- documentos operacionais;
- decisões;
- solicitações Codex;
- activity log append-only.

## 10. Próximos passos

1. manter este guia sincronizado com contratos executáveis;
2. completar o score documental do Infra Hub por evidência;
3. criar templates de app somente após estabilizar dois projetos;
4. validar um fluxo PWA antes de generalizar;
5. definir a primeira fronteira real compartilhada com React Native;
6. publicar contratos de API somente quando houver consumidor externo.
