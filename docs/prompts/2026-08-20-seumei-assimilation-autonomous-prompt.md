SEUMEI — assimilação autônoma dentro do Matriz-Hub

> Cole este documento como a primeira mensagem de um novo espaço de trabalho.

## Autoridade da missão

Você é o agente responsável por evoluir a nova Seumei dentro do Matriz-Hub.

Você possui autonomia para investigar, decidir, planejar, implementar, testar,
refatorar dentro do escopo e organizar a assimilação do sistema de referência.
Não espere que o usuário escolha framework, pastas, nomes de classes, padrões de
estado ou detalhes técnicos que podem ser descobertos no repositório.

Use a intenção deste documento como direção de produto, não como uma receita
mecânica. Quando duas soluções forem válidas, escolha a que:

1. respeita melhor a arquitetura já existente;
2. mantém isolamento multi-tenant por construção;
3. reduz duplicação e dívida;
4. entrega uma fatia vertical real;
5. deixa o próximo agente compreender e continuar o trabalho.

Só interrompa para pedir decisão humana quando houver falta de autoridade,
risco destrutivo, segredo/credencial ausente ou uma escolha de produto que
mude materialmente o resultado. Dúvidas técnicas devem ser investigadas e
decididas pelo agente.

## Missão

O repositório contém duas fontes de conhecimento:

- a fundação canônica da nova Seumei já criada no Matriz-Hub;
- uma implementação externa e extensa, chamada neste documento de
  `SeumeiRefactor`, disponibilizada como referência de migração.

A missão não é copiar, envelopar ou aplicar uma nova aparência ao projeto de
referência. A missão é:

> compreender o produto existente, preservar seu conhecimento valioso e
> assimilá-lo progressivamente em uma Seumei nativa do ecossistema Matriz.

O conhecimento deve sobreviver. A dívida, as duplicações e a arquitetura
incompatível não precisam sobreviver.

## Estado atual — não redescubra nem desfaça

Antes de agir, confirme este estado no Git e nos documentos do repositório. Se
o código divergir deste resumo, o código commitado e as decisões arquiteturais
mais recentes são a fonte de verdade.

- `apps/matriz-admin` é o console administrativo interno do ecossistema. Ele
  nasceu da aplicação anteriormente chamada Seumei, mas **não é a nova
  Seumei** e não é dono do domínio Seumei.
- `apps/seumeiapp` é a aplicação canônica do produto Seumei.
- Seu package público é `@matriz/app-seumei`.
- Seu `appId` estável é `seumei`.
- Seu desenvolvimento web utiliza a porta `3008`.
- O Matriz Hub já registra Matriz Admin e Seumei como produtos distintos.
- A nova Seumei já possui login, entrada pelo Hub, home protegida, resolução
  server-side do tenant ativo e uma leitura real tenant-scoped.
- O navegador não escolhe nem injeta `tenantId` nas consultas de domínio.
- `prisma/schemas/seumei.prisma` é a fonte de verdade da persistência Seumei.
- A camada de banco é consumida pela superfície existente de
  `@matriz/platform-db/seumei` quando apropriado.
- A ausência de dados é um estado legítimo; não deve ser mascarada por mocks.
- A ausência de configuração de banco deve produzir um estado explícito e
  seguro, nunca fallback silencioso para dados falsos.
- Matriz Admin observa produtos por APIs/gateways públicos e versionados; não
  recebe acesso irrestrito ao banco Seumei.
- A versão instalável atual é do **Matriz Admin**, não da nova Seumei.
- A nova Seumei permanece web-first até que fluxos de cliente estáveis
  justifiquem uma casca nativa própria. Não crie um instalador nesta primeira
  assimilação.

Leia obrigatoriamente, além dos `AGENTS.md` aplicáveis:

1. `docs/architectural-laws.md`;
2. `docs/monorepo-structure.md`;
3. `docs/app-communication.md`;
4. `docs/CHANGE-SAFETY.md`;
5. `docs/DECISION-LOG.md`;
6. `docs/seumei-migration-ledger.md`;
7. `docs/superpowers/specs/2026-08-19-matriz-admin-seumei-split-design.md`;
8. `apps/seumeiapp/AGENTS.md`;
9. `apps/seumeiapp/docs/AGENT-START-HERE.md`;
10. `apps/seumeiapp/README.md`;
11. `apps/seumeiapp/src/manifest/manifest.ts`;
12. `apps/seumeiapp/src/bootstrap/index.ts`.

## Fronteira com o outro trabalho em andamento

Existe outro fluxo evoluindo Matriz Control, Matriz Admin, Matriz Hub,
MatrizLib, distribuição e tooling. Evite conflitos:

- trabalhe prioritariamente em `apps/seumeiapp`;
- altere `prisma/schemas/seumei.prisma` e o adapter Seumei de banco somente
  quando a fatia exigir persistência real;
- altere packages compartilhados apenas quando já houver ao menos dois
  consumidores reais, superfície neutra e contrato estável;
- não refatore `apps/matriz-desktop`, `apps/matriz-admin`, `apps/matrizlib` ou
  áreas não relacionadas;
- não mova domínio Seumei para packages compartilhados;
- não importe `apps/<outro-app>/src/**` ou `apps/<outro-app>/app/**`;
- quando precisar conversar com Hub ou outro produto, use contrato público,
  API/gateway ou evento autorizado;
- uma mudança inevitável em contrato compartilhado deve ser pequena,
  documentada, testada e comunicada claramente no relatório final.

## A referência externa

Localize a pasta que o usuário trouxe para referência. Ela deve estar fora do
grafo normal do workspace, geralmente em algo semelhante a:

```text
apps/incoming/seumei-reference
```

Trate-a como fonte somente leitura:

- não a renomeie para virar a nova aplicação;
- não a adicione ao workspace;
- não importe seu código em runtime;
- não faça o build global depender dela;
- não copie árvores inteiras;
- não “limpe” ou reestruture a referência;
- não apague arquivos que pareçam mortos;
- não versione segredos, `.env`, bancos locais, caches ou outputs dela.

Ela existe para responder perguntas sobre comportamento, regras, fluxos,
modelos e intenção. Depois que uma fatia for assimilada e documentada, a nova
Seumei deve conseguir funcionar sem consultar aquela implementação em runtime.

## Investigue antes de implementar

Construa um modelo mental dos dois lados. Não tente ler milhares de arquivos em
ordem alfabética.

### No Matriz-Hub, descubra

- limites entre apps e packages;
- autenticação e sessão;
- resolução de conta, tenant e empresa ativa;
- Prisma, repositories e ownership de schemas;
- contratos públicos, eventos e integrações;
- MatrizLib: componentes, tokens, temas, sons e padrões;
- presenters/view models e separação UI-domínio;
- configuração, storage, observabilidade e feature flags;
- convenções de teste, build, CI e deploy.

### No SeumeiRefactor, descubra

- entrypoints, rotas e fluxos críticos;
- conta, empresa, multiempresa e memberships;
- onboarding e configuração inicial;
- produtos, variantes, categorias e catálogo;
- estoque e movimentos;
- loja, identidade visual, publicação e routing;
- pedidos, clientes, membros e permissões;
- modelos, migrations, serviços, APIs, hooks e stores;
- integrações externas e suas fronteiras;
- regras valiosas escondidas na UI ou em utilitários;
- duplicações, hacks, mocks permanentes e módulos incompletos.

Mapeie por jornada e domínio, não por quantidade de arquivos.

## Ledger de assimilação

Antes da primeira mudança de domínio, atualize ou complemente o ledger de
migração. Para cada capacidade relevante encontrada, registre:

```text
capacidade
comportamento observado
fonte de evidência
dados envolvidos
dependências
classificação
prioridade
destino arquitetural
estratégia de teste
estado da assimilação
```

Use estas classificações:

- **ADAPTAR** — regra e implementação possuem valor, mas precisam integrar-se;
- **RECONSTRUIR** — comportamento é necessário, arquitetura não é reutilizável;
- **PRESERVAR CONTRATO** — interoperabilidade ou dados exigem compatibilidade;
- **AVALIAR** — conhecimento insuficiente ou trade-off ainda aberto;
- **ELIMINAR DUPLICAÇÃO** — já existe fundação equivalente no Matriz-Hub;
- **SUBSTITUIR** — solução incompatível, insegura ou obsoleta;
- **CORRIGIR** — intenção válida com comportamento incompleto/incorreto;
- **ADIAR** — valor real, fora da fatia atual;
- **NÃO ASSIMILAR** — experimento, legado sem valor ou dívida deliberadamente
  abandonada.

Priorize como P0, P1, P2 ou P3. Não use prioridade para fingir compromisso:
registre também a evidência que justifica a classificação.

## Visão do produto

A Seumei deve evoluir para um produto multi-tenant conectado:

```text
LOGIN
  ↓
MATRIZ HUB
  ↓
CRIAR OU SELECIONAR EMPRESA
  ↓
ONBOARDING
  ↓
WORKSPACE DA EMPRESA
  ├── CONFIGURAÇÃO
  ├── PRODUTOS
  ├── ESTOQUE
  ├── LOJA
  ├── PUBLICAÇÃO
  ├── PEDIDOS
  └── MEMBROS
```

O objetivo não é produzir uma coleção de telas. Cada capacidade só é real
quando UI, regra, autorização, tenant, persistência, estados e navegação estão
conectados.

## Primeira missão executável

Não tente terminar toda a Seumei nesta execução. A primeira grande fatia é:

> **criação/seleção de empresa + membership inicial + onboarding persistente +
> entrada no workspace real da empresa.**

Ela deve partir da autenticação já existente e terminar em um workspace
tenant-scoped utilizável como fundação das próximas fatias.

Critérios funcionais mínimos:

1. um usuário autenticado sem empresa consegue criar uma empresa real;
2. a criação estabelece tenant, ownership/membership inicial e configuração
   mínima de forma consistente;
3. um usuário com mais de uma empresa vê apenas aquelas às quais pertence;
4. a empresa ativa é resolvida por sessão/autoridade server-side;
5. onboarding salva progresso real e pode ser retomado;
6. conclusão do onboarding conduz ao workspace da empresa;
7. acesso sem membership é negado;
8. tenant A não lê ou altera dados de tenant B, mesmo com IDs conhecidos;
9. estados vazio, loading, indisponível, conflito e erro são honestos;
10. o fluxo funciona após refresh e nova sessão, sem depender de estado apenas
    em memória ou `localStorage` como banco.

Você pode ajustar o desenho exato depois da investigação. Preserve o resultado
de usuário e as invariantes, não estes nomes de classes ou rotas.

## Ordem posterior sugerida

Depois que a primeira fatia estiver verde e commitada, avance por fatias
verticais independentes, reavaliando o ledger a cada uma:

1. shell da empresa, memberships e permissões;
2. produtos e catálogo;
3. estoque;
4. loja e publicação;
5. pedidos;
6. clientes e financeiro essencial;
7. identidade/configuração visual da loja;
8. integrações adicionais justificadas pela referência.

Não crie páginas vazias para anunciar fatias futuras.

## Multi-tenancy é uma invariante, não um filtro

Uma empresa representa um tenant ou se relaciona a ele conforme a arquitetura
canônica descoberta. Todo dado empresarial precisa de ownership explícito.

O isolamento deve existir:

- no modelo de dados;
- na resolução do contexto;
- nos repositories e queries;
- nas APIs e server actions;
- na autorização;
- nos testes negativos;
- na observabilidade sem vazamento de dados.

Regras obrigatórias:

- nunca confiar em `tenantId` vindo do browser para conceder acesso;
- nunca oferecer método de repository empresarial sem escopo de tenant;
- nunca consultar primeiro e “filtrar depois” na UI;
- nunca usar um fallback que escolha silenciosamente o primeiro tenant global;
- validar membership/capacidade além da mera existência do tenant;
- testar explicitamente dois tenants com IDs conhecidos entre si;
- evitar cache cuja chave não contenha contexto suficiente de tenant/usuário;
- não registrar segredos ou dados sensíveis em logs/telemetria.

## Dados e banco

Participe da estratégia de dados existente do Matriz-Hub sem misturar
ownership de domínios.

- não crie um segundo cliente Prisma ou sistema de configuração concorrente;
- não preserve nomes do schema antigo apenas por nostalgia;
- não aplique migrations destrutivas sem plano de compatibilidade e evidência;
- diferencie conta, usuário, membership, tenant, empresa e loja;
- use transações quando a criação da empresa exigir invariantes atômicas;
- use constraints/índices para reforçar invariantes importantes;
- mantenha dados reais desde o início;
- mocks são permitidos somente em testes ou adapters de desenvolvimento
  explicitamente declarados, nunca como persistência de produto.

Ao alterar schema, inclua migration coerente e estratégia para dados existentes.
Não execute ações destrutivas contra banco real sem autorização específica.

## UI e linguagem Matriz

A nova Seumei deve parecer parte do ecossistema, não uma aplicação externa
“tematizada”. Use exports públicos da MatrizLib quando houver ganho real:

- componentes;
- tokens;
- temas;
- sons;
- padrões de feedback e interação.

Não mova componentes de domínio da Seumei para a MatrizLib. Só proponha
extração compartilhada quando houver dois consumidores reais e contrato
estável.

A experiência deve ser simples apesar da arquitetura interna:

- poucas decisões por etapa;
- hierarquia clara;
- teclado e foco funcionais;
- responsividade real;
- acessibilidade;
- mensagens curtas e acionáveis;
- estados de loading sem saltos artificiais;
- recuperação de erro;
- nenhuma falsa sensação de persistência.

Web é a superfície atual. Preserve a portabilidade do domínio e da linguagem
visual, mas não crie uma segunda UI desktop nesta etapa.

## Método de trabalho

Siga este ciclo:

```text
INVESTIGAR
  ↓
MAPEAR JORNADAS E REGRAS
  ↓
ATUALIZAR O LEDGER
  ↓
PROPOR DECISÃO ARQUITETURAL
  ↓
PLANEJAR UMA FATIA VERTICAL
  ↓
IMPLEMENTAR COM TESTES
  ↓
VALIDAR TENANCY E SEGURANÇA
  ↓
VALIDAR UX EM BROWSER REAL
  ↓
CRITICAR O RESULTADO
  ↓
REFINAR
  ↓
COMMITAR
```

Antes do código:

1. audite a situação atual e o Git;
2. encontre os documentos e instruções locais;
3. produza uma decisão arquitetural objetiva baseada em evidência;
4. decomponha a primeira fatia em um plano executável;
5. registre premissas e não-objetivos.

Durante a implementação:

- faça mudanças pequenas por hipótese;
- prefira domínio app-local;
- use presenters/view models conforme as leis do monorepo;
- mantenha contratos explícitos;
- escreva testes negativos de autorização e tenancy;
- corrija a causa-raiz de falhas;
- não “faça passar” versionando caches ou outputs;
- não misture refactors não relacionados.

## Autonomia com limites

Você está autorizado a:

- decidir arquitetura interna da Seumei;
- alterar rotas e organização app-local quando justificado;
- modelar a persistência da fatia;
- adaptar regras valiosas da referência;
- substituir implementações incompatíveis;
- criar migrations não destrutivas;
- adicionar testes, presenters, repositories e documentação;
- fazer commits coerentes na branch de trabalho;
- corrigir erros encontrados dentro do escopo.

Esta autonomia não autoriza:

- push direto em `main`;
- apagar ou reescrever a referência externa;
- copiar o projeto inteiro;
- importar internals de outros apps;
- criar packages compartilhados para domínio Seumei;
- alterar Matriz Admin ou Matriz Control por conveniência;
- inventar dados ou credenciais;
- executar migrations destrutivas em ambiente real;
- reduzir testes, regras de lint ou TypeScript para passar gates;
- instalar dependências pesadas sem benefício comprovado;
- implementar todas as capacidades futuras como scaffolds vazios.

## Gates e loop de parada

Defina um limite de no máximo cinco rodadas de correção por grupo de falhas.
Dentro de cada rodada:

1. reproduza a falha;
2. determine a causa-raiz;
3. aplique a menor correção correta;
4. rode o teste focado;
5. rode novamente o gate afetado.

Se o mesmo bloqueio externo persistir em três rodadas, documente evidência,
preserve o estado seguro e peça somente a informação/autoridade indispensável.
Não transforme “autonomia” em loop infinito.

Antes de concluir uma fatia, execute no mínimo:

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei lint
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei build
pnpm run test:smoke
pnpm run prisma:validate
```

Se tocar root config, packages compartilhados, contratos, manifests, eventos,
tooling ou schema, execute também todos os gates globais definidos no
`package.json` e os boundary tests pertinentes.

Valide em browser real:

- login e redirecionamento;
- criação/seleção da empresa;
- retomada e conclusão do onboarding;
- entrada no workspace;
- refresh e nova sessão;
- acesso negado;
- tenant A versus tenant B;
- viewport desktop e mobile;
- teclado, foco, console e overflow.

O ciclo termina somente quando:

- a fatia vertical funciona de ponta a ponta;
- os testes provam isolamento de tenant;
- os gates passam consecutivamente no estado commitado;
- o worktree não contém segredos, caches ou artefatos proibidos;
- documentação e ledger refletem o que realmente existe;
- limitações remanescentes estão explícitas.

## Critério de sucesso da primeira assimilação

Ao final, deve ser possível responder “sim”, com evidência, a todas:

- a Seumei continua usando a identidade pública `seumei`?
- a aplicação pertence arquiteturalmente ao Matriz-Hub?
- o login existente conduz a empresas autorizadas?
- empresa, tenant e membership são persistidos de forma coerente?
- onboarding pode ser retomado e concluído?
- o workspace usa o tenant resolvido no servidor?
- tenant A é incapaz de acessar tenant B?
- não existe persistência empresarial falsa no frontend?
- a referência foi assimilada por conhecimento, não por cópia mecânica?
- outro agente consegue continuar pelo ledger e pelos testes?

Se alguma resposta for negativa, a fatia ainda não terminou.

## Entrega final esperada

Entregue:

1. resumo das decisões tomadas e das evidências usadas;
2. mapa conciso do SeumeiRefactor;
3. ledger atualizado com P0–P3 e estado de assimilação;
4. primeira fatia vertical funcional;
5. schema/migrations e contratos necessários;
6. testes de comportamento, autorização e isolamento;
7. evidência dos gates e da validação em browser;
8. commits coerentes;
9. riscos e limitações reais;
10. recomendação da próxima fatia.

Não me entregue apenas análise se for seguro implementar. Não me entregue
apenas páginas se os dados não forem reais. Não me entregue apenas build verde
se o fluxo não funcionar.

Comece investigando. Depois decida. Em seguida planeje a primeira fatia,
implemente-a, teste-a criticamente e refine o resultado.

> Não tente terminar a Seumei. Construa a fundação correta e assimile uma
> capacidade real por vez, até que o produto novo contenha o conhecimento útil
> do sistema anterior sem herdar sua dívida.
