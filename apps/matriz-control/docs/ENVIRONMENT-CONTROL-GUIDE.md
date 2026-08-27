# Guia de ambientes do ecossistema Matriz

Este guia mostra onde encontrar cada configuração e como o futuro Environment
Control Center tratará Development, Preview e Production sem versionar
segredos.

## Regra de ouro

- A Vercel é a fonte remota dos valores.
- `.env.example` é o catálogo versionado de nomes, nunca de valores.
- Arquivos `.env*` com valores permanecem ignorados pelo Git.
- `NEXT_PUBLIC_*` chega ao navegador e nunca deve conter segredo.
- Development, Preview e Production não devem compartilhar valores por
  acidente, especialmente bancos, tokens com escrita e analytics.

Documentação oficial:

- [Variáveis de ambiente na Vercel](https://vercel.com/docs/environment-variables)
- [Comandos `vercel env`](https://vercel.com/docs/cli/env)
- [Vercel em monorepos](https://vercel.com/docs/monorepos)
- [API REST da Vercel](https://vercel.com/docs/rest-api)
- [Variáveis de ambiente no Next.js](https://nextjs.org/docs/app/guides/environment-variables)

## Conta detectada

| Campo | Valor seguro para documentação |
| --- | --- |
| Time | `cascagrosa-4146s-projects` |
| Team ID válido | `team_TBJvFpcenbiSW9FGworK84E5` |
| Plano | Hobby |
| Projetos visíveis pela API REST | 10 |
| Projetos visíveis pelo conector OAuth | 0 |

O `VERCEL_ORG_ID` do `.env` local não corresponde ao time acessível e deve ser
corrigido durante a implementação. O token local foi aceito pela API. Nenhum
valor foi incluído neste documento.

Links principais:

- [Painel do time](https://vercel.com/cascagrosa-4146s-projects)
- [Configurações do time](https://vercel.com/cascagrosa-4146s-projects/~/settings)
- [Criar ou gerenciar Access Tokens](https://vercel.com/account/settings/tokens)
- [Integrações do time](https://vercel.com/cascagrosa-4146s-projects/~/integrations)

## Projetos e links diretos

O mapeamento para apps locais ainda não é seguro: os projetos não apresentam
`rootDirectory`. Até que o vínculo seja confirmado no Control, todos devem ser
tratados como não associados.

| Projeto Vercel | Variáveis detectadas | Ambiente |
| --- | ---: | --- |
| [v0-poc-arquitetura-modular](https://vercel.com/cascagrosa-4146s-projects/v0-poc-arquitetura-modular/settings/environment-variables) | 16 | Todos os três |
| [v0-matrizlibui-monorepo](https://vercel.com/cascagrosa-4146s-projects/v0-matrizlibui-monorepo/settings/environment-variables) | 0 | — |
| [v0-30-design-systems](https://vercel.com/cascagrosa-4146s-projects/v0-30-design-systems/settings/environment-variables) | 16 | Todos os três |
| [v0-cybersecurity-react-app](https://vercel.com/cascagrosa-4146s-projects/v0-cybersecurity-react-app/settings/environment-variables) | 0 | — |
| [v0-monorepo-matriz-poc](https://vercel.com/cascagrosa-4146s-projects/v0-monorepo-matriz-poc/settings/environment-variables) | 8 | Todos os três |
| [v0-poc-orcamentos-e-contratos](https://vercel.com/cascagrosa-4146s-projects/v0-poc-orcamentos-e-contratos/settings/environment-variables) | 0 | — |
| [v0-libui](https://vercel.com/cascagrosa-4146s-projects/v0-libui/settings/environment-variables) | 0 | — |
| [lib-ui](https://vercel.com/cascagrosa-4146s-projects/lib-ui/settings/environment-variables) | 0 | — |
| [v0-auditoria-de-schemas-prisma](https://vercel.com/cascagrosa-4146s-projects/v0-auditoria-de-schemas-prisma/settings/environment-variables) | 16 | Todos os três |
| [v0-auditoria-de-codigo](https://vercel.com/cascagrosa-4146s-projects/v0-auditoria-de-codigo/settings/environment-variables) | 0 | — |

## O que existe hoje

O `.env.example` declara:

```dotenv
DATABASE_URL=
CORE_DATABASE_URL=
HUB_DATABASE_URL=
SPOT_DATABASE_URL=
SEUMEI_DATABASE_URL=
CONTRACTS_DATABASE_URL=
WILLDASH_DATABASE_URL=
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_DEPLOY_HOOK_MATRIZ_HUB=
VERCEL_DEPLOY_HOOK_SPOT=
VERCEL_DEPLOY_HOOK_SEUMEI=
VERCEL_DEPLOY_HOOK_CONTRACTS=
VERCEL_DEPLOY_HOOK_WILLDASH=
SPLIT_REPO_PAT=
WORKBENCH_LOCAL_TOKEN=
MATRIZ_REPO_ROOT=
```

O `.env` local possui todas essas chaves, exceto `DATABASE_URL` e
`WORKBENCH_LOCAL_TOKEN`. Como os schemas já usam URLs específicas por app,
`DATABASE_URL` deve ser tratado apenas como fallback compatível, não como o
banco canônico de todos os produtos.

## As três formas

### 1. Development

Destino recomendado:

```text
apps/<app>/.env.development.local
```

Use credenciais de desenvolvimento, banco isolado ou branch de banco e limites
baixos nos provedores pagos. Esse arquivo é carregado pelo Next.js em modo de
desenvolvimento e permanece ignorado pelo Git.

### 2. Preview

Padrão recomendado: executar com as variáveis em memória, sem arquivo.

Quando um snapshot for realmente necessário:

```text
apps/<app>/.env.preview.local
```

Esse nome não é carregado automaticamente pelo Next.js. O Matriz Control deve
usá-lo somente em uma ação explicitamente selecionada como Preview. Overrides
por branch devem continuar na Vercel.

### 3. Production

Padrão recomendado: executar validações com variáveis em memória.

Exportação local excepcional:

```text
apps/<app>/.env.production.local
```

Esse arquivo pode ser carregado por builds locais com `NODE_ENV=production`.
Sua criação deve exigir intenção explícita, nunca ocorrer como consequência de
um clique de Development ou Preview.

## Onde conseguir cada credencial

### Vercel

| Variável | Onde obter | Observação |
| --- | --- | --- |
| `VERCEL_TOKEN` | [Access Tokens](https://vercel.com/account/settings/tokens) | Guardar apenas no servidor/local. Não usar `NEXT_PUBLIC_`. |
| `VERCEL_ORG_ID` | [Configurações do time](https://vercel.com/cascagrosa-4146s-projects/~/settings) | O ID válido detectado está na seção “Conta detectada”. |
| `VERCEL_DEPLOY_HOOK_*` | Abra o projeto → Settings → Git → Deploy Hooks | Um hook por app/branch; trate a URL como segredo. |

O projeto operacional atual pode ser aberto diretamente em
[Environment Variables](https://vercel.com/cascagrosa-4146s-projects/v0-monorepo-matriz-poc/settings/environment-variables).

### PostgreSQL, Neon e Prisma

| Variável | Onde obter | Uso recomendado |
| --- | --- | --- |
| `*_DATABASE_URL` | [Neon Console](https://console.neon.tech/app/projects) ou integração conectada ao projeto | URL com pooling para runtime. |
| `DATABASE_URL_UNPOOLED` | Neon → projeto → Connection Details | Migrações e operações que exigem conexão direta. |
| `POSTGRES_PRISMA_URL` | Variáveis criadas pela integração Neon/Vercel | Compatibilidade de clientes Prisma quando provisionada. |

Links úteis:

- [Integração Neon na Vercel](https://vercel.com/marketplace/neon)
- [Prisma: connection URLs](https://www.prisma.io/docs/orm/reference/connection-urls)
- [Neon: connection string](https://neon.com/docs/connect/connect-from-any-app)

Os seis schemas locais já possuem variáveis separadas. Mesmo que apontem hoje
para a mesma instância, mantenha os nomes separados para permitir a futura
divisão sem alteração na UI ou no domínio.

### GitHub

| Variável | Onde obter | Observação |
| --- | --- | --- |
| `SPLIT_REPO_PAT` | [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens) | Conceda somente repositórios e permissões realmente usados. |

### Tokens locais do ecossistema

| Variável | Como obter |
| --- | --- |
| `MATRIZ_CONTROL_LOCAL_TOKEN` | Gere localmente uma sequência aleatória longa; não reutilize token de provedor. |
| `WORKBENCH_LOCAL_TOKEN` | Gere outro token local independente. |
| `MATRIZ_REPO_ROOT` | Caminho absoluto da raiz desta cópia do monorepo. |

Control e Workbench não devem compartilhar o mesmo token.

## Analytics por app

Nenhuma chave de analytics apareceu no inventário acessível. Antes de criar
novas variáveis, identifique o provedor real de cada app.

| Provedor | Chaves comuns | Onde configurar |
| --- | --- | --- |
| Vercel Web Analytics | Normalmente não exige chave pública manual | [Analytics do projeto](https://vercel.com/docs/analytics) |
| Google Analytics | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | [Google Analytics](https://analytics.google.com/) |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | [Project settings](https://us.posthog.com/settings/project) |
| Sentry | `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN` | [Sentry projects](https://sentry.io/settings/projects/) |

Uma chave com `NEXT_PUBLIC_` será incorporada ao bundle do navegador. Isso pode
ser correto para IDs de medição, DSNs e chaves públicas de ingestão, mas nunca
para tokens administrativos, secrets de API ou credenciais de banco.

Sugestão de nomes para evitar colisão operacional:

```dotenv
NEXT_PUBLIC_HUB_ANALYTICS_ID=
NEXT_PUBLIC_SPOT_ANALYTICS_ID=
NEXT_PUBLIC_SEUMEI_ANALYTICS_ID=
NEXT_PUBLIC_CONTRACTS_ANALYTICS_ID=
NEXT_PUBLIC_WILLDASH_ANALYTICS_ID=
```

Adote esses nomes somente se o código realmente precisar de IDs distintos. O
catálogo do Control deve registrar provedor, finalidade, exposição pública e
apps consumidores, nunca o valor.

## Adicionando um novo app

1. Crie ou identifique o projeto Vercel correto.
2. Configure o Root Directory do projeto para `apps/<app>`.
3. Vincule o projeto local ao remoto no Environment Control Center.
4. Declare os nomes necessários em `.env.example` sem valores.
5. Marque cada chave como obrigatória/opcional e pública/servidor.
6. Configure valores diferentes para Development, Preview e Production quando
   o risco ou a finalidade forem diferentes.
7. Execute o Doctor e resolva chaves ausentes antes do primeiro deploy.
8. Faça o primeiro pull somente para Development.
9. Valide Preview sem copiar Production.

## Rotação segura

1. Crie o novo valor no provedor.
2. Atualize primeiro Development e valide.
3. Atualize Preview e execute testes.
4. Atualize Production e faça um novo deployment; alterações de variáveis não
   afetam deployments antigos automaticamente.
5. Revogue o valor antigo no provedor.
6. Atualize os snapshots locais necessários.
7. Nunca registre o valor em issue, commit, screenshot ou log.

## Checklist rápido

- [ ] O app está ligado ao projeto Vercel correto.
- [ ] O Root Directory aponta para `apps/<app>`.
- [ ] O time selecionado é `cascagrosa-4146s-projects`.
- [ ] Nenhum segredo usa `NEXT_PUBLIC_`.
- [ ] Development não aponta sem intenção para o banco de Production.
- [ ] Preview possui todas as chaves exigidas.
- [ ] Analytics identifica claramente o app e o ambiente.
- [ ] Os arquivos locais terminam em `.local` e estão ignorados.
- [ ] Nenhum token aparece no terminal, log, screenshot ou Git.
- [ ] Um novo deploy foi criado depois de alterar variáveis remotas.

## Problemas atuais a resolver na implementação

1. Corrigir `VERCEL_ORG_ID` para o time acessível.
2. Reparar ou substituir com segurança a CLI global quebrada.
3. Definir os vínculos entre apps locais e os dez projetos remotos.
4. Decidir quais projetos antigos podem ser arquivados — sem exclusão automática.
5. Identificar os provedores reais de analytics de cada app.
6. Adicionar `WORKBENCH_LOCAL_TOKEN` localmente.
7. Decidir se o fallback `DATABASE_URL` continua necessário.
