# Matriz Hub Alpha Environment — design

**Status:** aprovado em 2026-08-13

**Escopo:** `apps/matriz-hub`

**Referência visual primária:** cinco telas fornecidas pelo proprietário em 2026-08-13

**Prioridade:** funcionalidade → compreensão → consistência → performance → estética

## 1. Objetivo

Transformar o Matriz Hub existente em um ambiente operacional único, espacial e profissional, preservando suas funcionalidades, dados, APIs, autenticação, autorização, persistência e integrações reais.

O resultado não é um dashboard com tema novo. É a mesma aplicação reorganizada por uma linguagem de interface na qual contexto, entidades, estados, ações e consequências possuem posição e representação visual consistentes.

Esta é uma alpha exclusiva do Matriz Hub. Spot, Seumei, Contracts, WillDash, Sites e Matriz Workbench permanecem visual e tecnicamente inalterados. O Hub pode continuar lendo seus `public-contract.ts`, mas não pode importar internals de outro app.

## 2. Decisões centrais

1. A transformação será incremental e vertical. Cada ciclo termina com software navegável e verificável.
2. As 42 rotas atuais permanecem válidas. A experiência muda sem quebrar URLs existentes.
3. Novas primitives visuais começam app-local em `apps/matriz-hub/src/ui`. Não serão promovidas para `packages/design/*` sem um segundo consumidor real.
4. UI consome ViewModels. Novos fluxos não acessarão entidades cruas ou repositories diretamente.
5. Estados inexistentes não serão falsificados. A interface distingue `disponível`, `sem dados`, `planejado`, `indisponível` e `falhou`.
6. Recursos citados no roadmap serão implementados como capabilities reais quando houver fonte de verdade e autoridade. Um scaffold não será apresentado como execução.
7. Three.js/WebGL não entram na fundação. SVG, CSS, Canvas leve e movimento orientado a estado são suficientes para a espacialidade inicial. Uma dependência 3D só entra mediante caso de uso medido.
8. Dark mode é a apresentação canônica da alpha. Contraste, semântica e redução de movimento continuam obrigatórios.

## 3. Tese visual, conteúdo e interação

### Tese visual

Um centro operacional noturno de grafite azulado, superfícies finas e profundas, precisão de instrumento e luminosidade reservada a foco, atividade e estado.

A influência de Oblivion aparece na composição espacial, na sensação de ambiente, na profundidade e no uso de painéis contextuais. Não aparecem fantasia, linguagem medieval ou mecânicas de jogo.

### Plano de conteúdo

1. Contexto global persistente: aplicação, projeto, ambiente, saúde, busca e sessão.
2. Orientação local: posição atual, escopo, filtros e estado da área.
3. Trabalho ativo: a função principal de cada rota.
4. Contexto selecionado: detalhes, relações, histórico e ações da entidade.
5. Atividade temporal: eventos recentes, sincronização, falhas e resultados.

### Tese de interação

1. Seleção com continuidade espacial: a entidade permanece na superfície principal e abre seu contexto no inspetor, sem salto arbitrário.
2. Movimento comunica estado: entrada curta de regiões, traço em fluxos ativos, pulso discreto durante execução e confirmação localizada após ações.
3. Navegação preserva orientação: grupos, item ativo, breadcrumbs e contexto de projeto mudam como uma única composição.

Todo movimento deve desaparecer ou se tornar instantâneo com `prefers-reduced-motion: reduce`.

## 4. Estado atual assimilado

### Aplicação

- Next.js 16 App Router, React 19 e TypeScript estrito.
- 42 páginas e 37 route handlers no estado analisado.
- `bootstrapMatrizHub()` registra sete apps através de contratos públicos.
- `HubAuthAdoption` protege superfícies autenticadas no cliente e mantém exceções para login, público, auditoria e Praticies.
- O shell atual é uma sidebar fixa de 240 px com navegação plana e conteúdo em `Container`.
- A UI usa `@matriz/design-ui`, utility shim, estilos inline e CSS modules locais.
- Não existem `loading.tsx`, `error.tsx` ou `not-found.tsx` no Hub.

### Fontes de dados

| Área | Fonte atual | Natureza que a UI deve declarar |
|---|---|---|
| Catálogo e registry | manifests reais em `public-contract.ts` | contrato registrado |
| Projetos e saúde institucional | registry institucional, seed e enrichment | snapshot institucional |
| MatrizDocs | Prisma do schema Hub | persistido |
| Praticies Patterns | filesystem local controlado | execução local |
| Preferências de Praticies | browser storage | preferência local |
| Eventos | EventBus global em memória | sessão do processo |
| Telemetria | registry global em memória | sessão do processo |
| External links | store global em memória | sessão do processo |
| Onboarding | store compartilhado mock/in-memory/local | demonstração local |
| Feature flags | configuração mock por tenant/app | demonstração |
| Autenticação | broker mock com sessão local e cookie auxiliar | alpha local |
| Capabilities/temas | store app-local em memória | alpha local |
| Roadmap/backlog | `apps/matriz-hub/.matriz/**` | arquivo local versionado |

### Dívida relevante para a transformação

- Navegação sem agrupamento, estado ativo robusto ou adaptação mobile.
- Predominância de cards e badges sem hierarquia espacial suficiente.
- Múltiplas fontes visuais: tokens, temas, utility shim, CSS modules e estilos inline.
- Páginas MatrizDocs que instanciam repository Prisma na composição da rota.
- Ausência de estados de rota consistentes.
- Eventos e telemetria não atravessam processos ou deployments.
- Algumas APIs de leitura e operação ainda têm proteção inconsistente.
- Lint preexistente falha porque `src/auth/actor-context.ts` importa a camada de capabilities.

O redesign não esconderá essas condições. Onde a dívida impactar diretamente o fluxo migrado, ela será corrigida dentro do escopo do Hub.

## 5. Arquitetura de interface

### 5.1 Zonas persistentes

#### Global Context Bar

Faixa superior com:

- marca Matriz Hub;
- projeto ou contexto ativo;
- ambiente e origem dos dados;
- saúde consolidada;
- command search;
- atividade/alertas;
- sessão do usuário.

Valores ausentes exibem `Não configurado` ou `Sem sinal`, nunca conteúdo inventado.

#### Operational Navigation

Navegação lateral agrupada por intenção. Mostra item ativo, indicadores de atenção e capacidade de recolher. Contagens só aparecem quando derivadas de uma fonte real.

#### Primary Workspace

Área principal da rota. Cada tela possui uma ação ou decisão dominante e evita mosaicos de cards genéricos.

#### Context Inspector

Painel lateral para entidade selecionada, propriedades, relações, histórico e ações. É opcional: rotas sem seleção usam a largura completa. No tablet vira sheet; no mobile vira tela contextual sobreposta com retorno explícito.

#### Operational Dock

Faixa inferior opcional com origem dos dados, atividade, conectividade e última atualização. Ela não mostra CPU, memória, rede ou região sem telemetria correspondente.

### 5.2 Navegação proposta

#### Centro operacional

- Visão Geral — `/`
- Projetos — `/projects`
- Saúde — `/health`
- Intelligence — `/intelligence`

#### Estrutura

- Arquitetura — `/architecture` (nova)
- Registry — `/registry`
- Ecossistema — `/ecosystem`
- Links externos — `/external-links`

#### Operação

- Eventos — `/events`
- Telemetria — `/telemetry`
- Onboarding — `/onboarding-status`
- Feature flags — `/feature-flags`

#### Conhecimento

- MatrizDocs — `/docs`
- Revisão — `/docs/review-desk`
- Sugestões — `/docs/suggestions`
- Contextos — `/docs/context`
- Grafo — `/docs/graph`
- Timeline — `/docs/timeline`
- MCP documental — `/docs/mcp`
- Configurações — `/docs/settings`

Rotas MatrizDocs de entidade, documento, edição, versões, importação, exportação, runs, tasks, governance e approvals continuam contextuais e não ocupam todas a navegação global.

#### Ferramentas

- Praticies — `/praticies`
- Catálogo Praticies — `/praticies/apps`
- MCP — superfície consolidada que aponta para a capability existente

Praticies permanece imersivo, autenticado e fora do shell quando a tarefa exigir o viewport inteiro.

#### Evolução

- Roadmap — `/roadmap` (nova)
- Agentes — `/agents` (nova, com estados honestos)
- Releases — `/releases` (nova, orientada a evidências)

#### Sistema

- Auditoria — `/audit`
- Aparência e capabilities — superfície contextual de configurações
- Sessão — painel de usuário

`/login` e `/public` permanecem fora do shell autenticado.

## 6. Matriz de realocação das rotas

| Rota | Nova área | Representação principal |
|---|---|---|
| `/` | Centro operacional | mapa de situação, atenção, atividade e próximos passos |
| `/catalog` | Estrutura | catálogo detalhado acessível a partir do registry e busca |
| `/registry` | Estrutura | apps, contratos, capabilities, eventos e integrações |
| `/projects` | Centro operacional | portfólio institucional com saúde e origem |
| `/projects/[id]` | Centro operacional | workspace de projeto + inspetor |
| `/health` | Centro operacional | matriz de readiness e checks |
| `/ecosystem` | Estrutura | fluxos entre produtores, consumidores e superfícies |
| `/intelligence` | Centro operacional | telemetria institucional disponível e lacunas explícitas |
| `/events` | Operação | timeline de eventos da sessão |
| `/telemetry` | Operação | stream e agregação por app/categoria |
| `/external-links` | Estrutura | relações cross-app |
| `/onboarding-status` | Operação | progresso por tenant/app com origem mock declarada |
| `/feature-flags` | Operação | flags por tenant/app com origem mock declarada |
| `/docs` | Conhecimento | biblioteca viva e fila de atenção |
| `/docs/new` | Conhecimento | criação contextual |
| `/docs/import` | Conhecimento | ingestão com preview e consequência |
| `/docs/converter` | Conhecimento | conversões e runs |
| `/docs/[docId]` | Conhecimento | documento + inspetor de versão/relações |
| `/docs/[docId]/edit` | Conhecimento | edição focada |
| `/docs/[docId]/versions` | Conhecimento | histórico de versões |
| `/docs/[docId]/timeline` | Conhecimento | histórico temporal |
| `/docs/[docId]/graph` | Conhecimento | relações do documento |
| `/docs/entities` | Conhecimento | entidades canônicas |
| `/docs/entities/[entityId]` | Conhecimento | entidade + relações/documentos |
| `/docs/context` | Conhecimento | context packages |
| `/docs/context/[contextId]` | Conhecimento | contexto + publicação |
| `/docs/graph` | Conhecimento | grafo institucional |
| `/docs/suggestions` | Conhecimento | propostas revisáveis |
| `/docs/review-desk` | Conhecimento | fila de revisão |
| `/docs/approvals` | Conhecimento | aprovações e estados |
| `/docs/governance` | Conhecimento | candidates de governança |
| `/docs/tasks` | Conhecimento | task candidates |
| `/docs/runs` | Conhecimento | execuções documentais |
| `/docs/exports` | Conhecimento | artefatos exportados |
| `/docs/mcp` | Conhecimento | resources e tools documentais |
| `/docs/timeline` | Conhecimento | timeline global |
| `/docs/settings` | Sistema/Conhecimento | políticas da biblioteca |
| `/praticies` | Ferramentas | bancada imersiva |
| `/praticies/apps` | Ferramentas | catálogo, instalação e estúdio |
| `/audit` | Sistema | relatório editorial independente |
| `/public` | Público | superfície institucional sem autenticação |
| `/login` | Acesso | autenticação independente |

Rotas de API mantêm seus paths. A reorganização visual não altera contratos HTTP existentes.

## 7. Novas capabilities alpha

### 7.1 Arquitetura

`/architecture` é uma projeção real derivada de:

- manifests registrados;
- `routes`, `capabilities`, `eventsProduced`, `eventsConsumed` e `integrations`;
- projetos institucionais e suas superfícies públicas;
- external links disponíveis.

O primeiro modo é um mapa SVG acessível com lista equivalente. Não lê internals de outros apps.

Estados:

- mapa disponível;
- contrato parcialmente descrito;
- integração sem consumidor/produtor;
- fonte indisponível;
- seleção no inspetor.

### 7.2 Roadmap

`/roadmap` lê apenas fontes Hub-local permitidas:

- `apps/matriz-hub/.matriz/roadmap.json`;
- `apps/matriz-hub/.matriz/backlog/*.json`;
- decisões e referências explicitamente apontadas por esses registros.

O roadmap vazio é um estado válido. A UI pode propor a ação humana de organizar itens, mas não conclui, promove ou altera backlog automaticamente.

### 7.3 Agentes

`/agents` começa como diretório de capacidades e supervisão, não como teatro de agentes ativos.

Possíveis fontes, em ordem de confiança:

1. execuções Hub-local persistidas e autorizadas;
2. eventos reais que declarem ator/agente;
3. itens de roadmap classificados como agente planejado.

Os estados `planejado`, `configuração ausente`, `aguardando`, `executando`, `requer aprovação`, `concluído` e `falhou` só aparecem quando sustentados pela fonte. A alpha não importa requests/runs internos do Workbench.

### 7.4 Releases

`/releases` apresenta evidências existentes:

- configuração de deploy documentada;
- manifests e versões;
- eventos/telemetria de publicação, quando existirem;
- checks locais explicitamente executados.

`Configurado` não equivale a `Publicado`. `Último deploy` só aparece com fonte verificável.

## 8. Linguagem operacional

Cada ação importante combina:

1. verbo humano;
2. termo técnico secundário;
3. símbolo consistente;
4. estado atual;
5. consequência ou última evidência.

Exemplos:

- `Atualizar informações` / `Sync` / `Última leitura há 2 min`;
- `Disponibilizar versão` / `Deploy` / `Requer aprovação`;
- `Criar contexto de trabalho` / `Context package` / `Será publicado para 3 consumers`;
- `Gerar mapa do projeto` / `Patterns` / `Grava dois artefatos em .patterns`.

### Vocabulário de estado

Estados canônicos:

- disponível;
- executando;
- aguardando;
- requer atenção;
- requer aprovação;
- bloqueado;
- concluído;
- falhou;
- temporário;
- oficial;
- arquivado;
- planejado;
- indisponível;
- origem desconhecida.

Cada estado usa pelo menos dois sinais entre ícone, forma, texto, posição, contraste e movimento. Cor nunca é o único sinal.

## 9. Primitives app-local

### Tokens

Criar um contrato CSS app-local para:

- canvas e níveis de superfície;
- texto principal, secundário e discreto;
- linhas, bordas e focos;
- ação primária;
- estados semânticos;
- spacing de 4 px;
- tipografia sans e mono;
- raios baixos e médios;
- elevação por sombra, linha e luminosidade;
- duração e easing;
- dimensões do shell.

Os tokens podem consumir valores básicos de `@matriz/design-system`, mas a linguagem experimental não altera temas dos outros apps.

### Componentes fundamentais

- `HubEnvironment`
- `GlobalContextBar`
- `OperationalNav`
- `NavGroup`
- `WorkspaceHeader`
- `ContextInspector`
- `OperationalDock`
- `CommandSearch`
- `StatusMark`
- `StatusLabel`
- `ActionObject`
- `MetricReading`
- `ActivityStream`
- `ProgressFlow`
- `DataOrigin`
- `SurfaceState`
- `SystemMap`
- `EntityList`
- `InspectorSection`

Primitives não recebem entities de domínio. Props são semânticas ou ViewModels.

## 10. Composição da Visão Geral

A home deixa de ser catálogo de cards e passa a responder:

1. Onde estou?
2. Qual é o estado do ecossistema?
3. O que precisa de atenção?
4. O que mudou?
5. Qual é o próximo passo verificável?

Composição desktop:

- panorama do portfólio com apps/projetos reais;
- projeto ou contexto selecionado;
- saúde e pontos de atenção;
- fluxo de integrações resumido;
- atividade recente derivada de eventos/telemetria;
- fila de próximo passo baseada em condições reais;
- inspetor do item selecionado.

Sem eventos ou telemetria, a área explica a ausência e a duração limitada da fonte em memória.

## 11. Dados e fluxo de apresentação

Novas telas seguem:

```text
source/repository
  → application query/use case
  → presenter
  → serializable ViewModel
  → route composition
  → visual component
```

O shell não consulta repositories de domínio. Ele recebe um `HubEnvironmentVM` composto por queries app-local.

MatrizDocs será migrado incrementalmente: primeiro presenters e composição visual; depois remoção dos acessos diretos ao repository nas páginas tocadas. Não será feita uma reescrita completa do repository monolítico dentro do redesign.

Erros externos são convertidos em estados semânticos e mensagens seguras. Detalhes técnicos ficam em logs controlados ou disclosure autorizado.

## 12. Estados de tela

Criar estados globais e locais para:

- carregando;
- vazio inicial;
- vazio após filtro;
- indisponível por dependência;
- erro recuperável;
- erro sem recuperação local;
- acesso negado;
- dados parciais;
- sincronizando;
- ação aguardando confirmação;
- ação em execução;
- sucesso com consequência;
- resultado disponível;
- origem mock/demonstração;
- capability planejada.

Rotas importantes recebem `loading.tsx`, `error.tsx` ou componentes de boundary apropriados. `not-found.tsx` cobre entidades e documentos ausentes sem expor detalhes internos.

## 13. Responsividade

### Desktop amplo — 1440 px ou mais

- barra global completa;
- nav lateral expandida;
- workspace;
- inspetor simultâneo quando houver seleção;
- dock operacional.

### Notebook — 1024 a 1439 px

- nav compacta ou recolhível;
- inspetor sobreposto/recolhível;
- contexto global reduzido a campos essenciais;
- dock com menos leituras.

### Tablet — 768 a 1023 px

- nav em drawer;
- inspetor em sheet;
- workspace em uma coluna;
- tabelas viram listas relacionais preservando ações.

### Mobile — abaixo de 768 px

- header compacto;
- navegação modal com foco preso e retorno;
- uma superfície por vez;
- ação primária próxima ao conteúdo;
- inspetor como tela contextual;
- dock removido ou reduzido a estado essencial;
- nenhum zoom ou canvas horizontal obrigatório para operar.

Praticies mantém sua regra específica: viewport imersivo em telas maiores e fluxo vertical com scroll em mobile.

## 14. Acessibilidade

- Landmarks semânticos e skip link.
- `aria-current` na navegação.
- foco visível em todas as superfícies interativas.
- foco gerenciado em drawer, inspector e command search.
- ícone acompanhado por label acessível.
- estados não dependem apenas de cor.
- gráficos e mapas possuem lista/tabela equivalente.
- touch targets mínimos de 44 × 44 px em telas de toque.
- contraste mínimo WCAG AA para texto e controles.
- mensagens de ação importantes usam live regions com parcimônia.
- `prefers-reduced-motion` elimina movimentos não essenciais.

## 15. Performance

- Server Components por padrão.
- Client Components apenas para seleção, command search, drawers, live feedback e interações reais.
- Lazy load do mapa de arquitetura e visualizações pesadas.
- Sem loops de animação permanentes fora de atividade real.
- SVG antes de Canvas; Canvas antes de WebGL.
- Listas extensas paginadas ou virtualizadas conforme medição.
- Queries da Visão Geral executadas em paralelo e retornam resultados parciais tipados.
- Nenhuma nova biblioteca visual pesada entra sem orçamento e justificativa.

## 16. Segurança e autorização

O redesign preserva `AuthGate`, mas qualquer nova mutation deve validar a sessão no servidor.

- Nenhuma rota nova aceita caminho arbitrário.
- Nenhuma UI revela segredos, cookies ou headers sensíveis.
- Agentes, releases e automações exigem autoridade explícita antes de mutar estado.
- Roadmap e backlog não são alterados automaticamente pela leitura da interface.
- A correção do boundary entre auth e capabilities deve acontecer antes de usar capabilities como autorização canônica.

Questões estruturais maiores de auth e multi-tenant permanecem no roadmap de segurança, salvo quando bloquearem diretamente uma capability desta alpha.

## 17. Estratégia de entrega

### Ciclo 1 — Fundação do ambiente

- tokens app-local;
- primitives fundamentais;
- shell responsivo;
- navegação agrupada;
- estados globais;
- command search inicial;
- Visão Geral com dados existentes.

### Ciclo 2 — Estrutura e portfólio

- projetos;
- saúde;
- registry e catálogo;
- arquitetura;
- ecossistema;
- external links;
- inspetores de projeto/app/integração.

### Ciclo 3 — Operação

- eventos;
- telemetria;
- onboarding;
- feature flags;
- origem/frescor dos dados;
- activity dock.

### Ciclo 4 — Conhecimento

- home MatrizDocs;
- documentos e edição;
- review, approvals e suggestions;
- context packages;
- grafo, entidades, timeline, runs, exports, tasks, governance e MCP;
- presenters nas rotas tocadas.

### Ciclo 5 — Ferramentas e evolução

- integração visual de Praticies sem regressão do modo imersivo;
- roadmap e backlog Hub-local;
- agentes com estados verificáveis;
- releases baseadas em evidências.

### Ciclo 6 — Revisão cruzada

- responsividade completa;
- acessibilidade;
- performance;
- consistência de microcopy;
- remoção de duplicações;
- QA visual e funcional de todas as rotas;
- documentação final.

Cada ciclo terá sua própria implementação detalhada e poderá ser revisado sem bloquear a definição dos ciclos seguintes.

## 18. Testes e verificação

### Automatizados

- testes unitários de presenters e resolução de estados;
- testes de navegação e agrupamento;
- testes dos ViewModels agregados;
- testes de componentes interativos críticos;
- testes de APIs novas e autorização server-side;
- smoke tests existentes;
- boundary tests para impedir imports de outros apps;
- lint e typecheck do Hub.

### Browser

Fluxos mínimos:

1. autenticar e abrir a Visão Geral;
2. navegar por todos os grupos sem perder orientação;
3. selecionar projeto/app e operar o inspetor;
4. abrir dados vazios, parciais e indisponíveis;
5. usar teclado no shell, command search, drawer e inspector;
6. executar uma ação real de Praticies;
7. criar, revisar e publicar um documento quando o banco estiver disponível;
8. validar 1440, 1280, 1024, 768 e 390 px;
9. validar redução de movimento e contraste.

### Gates por ciclo

```text
pnpm --filter @matriz/app-matriz-hub typecheck
pnpm --filter @matriz/app-matriz-hub lint
pnpm test:smoke
```

Mudanças em manifest ou contratos públicos também exigem smoke tests. Mudanças em root config ou packages compartilhados não fazem parte da estratégia inicial.

## 19. Critérios de sucesso

- Todas as rotas existentes continuam alcançáveis.
- Nenhuma funcionalidade real é substituída por mock visual.
- A home explica contexto, estado, atenção, mudança e próximo passo.
- Navegação, workspace, inspetor e atividade parecem áreas do mesmo ambiente.
- O usuário reconhece a origem e o frescor de cada dado.
- Estados relevantes são compreensíveis sem depender apenas de texto ou cor.
- Desktop, notebook, tablet e mobile possuem composições estruturais próprias.
- Outros apps não recebem mudanças.
- Nenhum import proibido é introduzido.
- O Hub mantém typecheck, lint e smoke tests verdes ao final, descontadas apenas falhas preexistentes explicitamente registradas e corrigidas antes da entrega final.

## 20. Fora de escopo

- redesign de outros apps;
- extração antecipada para packages compartilhados;
- persistência distribuída de eventos/telemetria como parte puramente visual;
- autenticação de produção completa;
- execução de agentes sem runtime e autorização reais;
- telemetria operacional inventada;
- Three.js/WebGL ornamental;
- alteração automática de roadmap, backlog, aprovação ou publicação.

## 21. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Big-bang em 42 páginas | ciclos verticais e rotas sempre navegáveis |
| Drift entre CSS antigo e novo | tokens app-local e migração por superfície |
| Confundir mock com produção | componente `DataOrigin` e microcopy explícita |
| Layout das referências ficar denso demais | uma ação dominante, progressive disclosure e inspector |
| Alterações locais serem sobrescritas | commits pequenos, staging seletivo e nenhum reset destrutivo |
| Novo domínio poluir packages | implementação app-local |
| Mapas visuais inacessíveis | lista equivalente, foco e navegação por teclado |
| Performance degradar por efeitos | lazy load, redução de movimento e orçamento de dependências |

## 22. Decisão final

A alpha será construída como ambiente operacional app-local, não como tema. A fundação cria linguagem e estrutura; cada módulo existente é então reinterpretado sobre suas fontes reais. Capabilities do roadmap entram progressivamente, com estados honestos e evidência verificável.
