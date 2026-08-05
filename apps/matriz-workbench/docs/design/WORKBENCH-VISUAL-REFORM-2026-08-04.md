# Reforma visual do Matriz Workbench

Data: 2026-08-04
Estado: aprovado para execução autônoma nesta rodada pelo pedido do usuário.

## Resultado buscado

Transformar o Workbench em uma superfície operacional calma, legível e adaptável, corrigindo o contraste real do modo escuro e reduzindo ruído por meio de hierarquia, abreviações e informação sob demanda.

## Tese visual

Um cockpit local em grafite, com violeta usado como sinal e não como decoração: tipografia legível, superfícies discretas, poucos controles visíveis e detalhes revelados somente quando a intenção do usuário fica clara.

## Plano de conteúdo

1. Orientação: rota, estado local e ação principal.
2. Trabalho: métricas e itens que exigem decisão.
3. Contexto: detalhes, IDs, políticas e explicações sob `InfoHint` ou inspector.
4. Comunicação: Sites, previews e metadata como superfície explícita, sem importar internals de `apps/sites`.

## Tese de interação

- O menu lateral pode ficar curto e se expandir por botão, foco ou aproximação do ponteiro.
- A topbar pode operar em `auto`, revelada no topo, ou `pinned`; toque, teclado e movimento reduzido mantêm uma versão persistente.
- Tema e design system são reconhecidos por swatch + sigla (`MG`, `NB`, `ZN`), sempre com nome acessível completo.

## Causas-raiz confirmadas

### Contraste

O painel compartilhado `EcosystemBar` recebe um fundo escuro por `--surface`, mas o texto cai no fallback literal `#111` porque o Workbench não publica `--surface-fg` nem `--color-foreground`. A reprodução no navegador mediu fundo `rgb(11, 17, 27)` e texto `rgb(17, 17, 17)`.

O segundo defeito é a divergência entre tokens testados e estilos renderizados: `--wb-accent-text` tem contraste adequado, mas vários botões e marcas ainda usam branco literal. Superfícies legadas claras também preservam o foreground escuro ou herdam o foreground do tema sem declarar o par completo.

### Poluição visual

A interface comprime informação com texto de 9–10 px, enum em inglês, IDs completos e controles simultâneos. Em breakpoints menores, um seletor genérico esconde todos os `span` da navegação, inclusive ícones e nomes acessíveis visíveis.

### Shell

O rail atual mistura áreas do Workbench, projetos detectados e sessão. A evolução deve continuar app-local. `SmartTopbar` e `SmartSidebar` de `C:\Apps\matrizlibUI` servem como referência comportamental, mas `@matriz/product-ui` permanece bloqueado: mistura domínio forte, showcase e componentes sem o gate de adoção necessário.

## Abordagens consideradas

### 1. Reforma incremental app-local + contrato visual compartilhado — escolhida

Corrige o contrato genérico usado pelo painel compartilhado, mantém temas e shell dentro do Workbench e aplica disclosure progressivo primeiro em Shell, Foco e Sites. É a menor fatia que resolve o bug e prova os conceitos pedidos.

### 2. Importar a Matriz Lib UI

Rejeitada nesta fase. A auditoria existente bloqueia `@matriz/product-ui`; copiar os componentes grandes também carregaria problemas de acessibilidade e semântica que não pertencem ao Workbench.

### 3. Criar novo package compartilhado

Adiada. Não existem dois consumidores comprovados da nova API de shell. Extração só será proposta depois de uma implementação app-local estável e um segundo consumidor real.

## Arquitetura

### Tokens

- Presets continuam em `src/ui/theme-presets.ts`.
- Cada preset recebe `shortLabel` de duas letras.
- A saída de variáveis publica aliases genéricos compatíveis com o design compartilhado, derivados dos tokens `--wb-*`.
- Componentes compartilhados usam apenas aliases genéricos e fallbacks simétricos; nunca conhecem `--wb-*`.
- Contraste mínimo: 4,5:1 para texto normal e 3:1 para foco e limites de componentes.

### Componentes app-local

- `InfoHint`: explicação curta acionável por hover, foco e toque, sem substituir rótulos essenciais.
- `ThemeSystemPicker`: swatch + sigla no compacto; nomes e descrições completas na galeria.
- `ShellChrome`: fronteira client pequena para estado do rail e política da topbar.
- `AppShell`: continua recebendo ViewModels e compondo links, projeto, sessão, comando e aparência.
- Presenters da home traduzem estado, prioridade e referências curtas antes do render.

### Estados do shell

- Rail `expanded`: largura atual, rótulos completos.
- Rail `collapsed`: 60 px, ícones/siglas com nomes acessíveis; expande temporariamente por hover/foco em desktop.
- Topbar `pinned`: sticky e persistente.
- Topbar `auto`: overlay revelado por sentinel, foco ou ponteiro; controles não ficam focáveis enquanto ocultos.
- Em `pointer: coarse`, viewport pequena ou `prefers-reduced-motion`, topbar permanece visível e o menu usa drawer/estado explícito.

### Sites

`/sites` comunica saúde de metadata, idiomas, estado e ações por blocos compactos. A origem continua sendo `SiteCatalogBridge`, que projeta dados seguros; nenhum import de `apps/sites/src/**` ou `apps/sites/app/**` será criado.

## Microcopy e abreviações

- Topbar: `Local`, `MG`, busca.
- Métricas: `Ativos`, `Bloqueios`, `Agentes`, `Apps`.
- Status: `Em andamento`, `Em revisão`, `Na fila`, `Bloqueada`, `Concluída`.
- Referência de item: identificador curto visível; ID completo em nome acessível ou `InfoHint`.
- Presets: `DF`, `NB`, `MG`, `PL`, `AU`, `ZN`, `PU`, `TR`, `DR`, `GL`.

## Acessibilidade

- `aria-current="page"` em destinos ativos.
- Toggle do rail com `aria-expanded` e `aria-controls`.
- Informação essencial nunca depende apenas de cor, swatch ou tooltip.
- Atalhos globais ignoram `input`, `textarea`, `select` e `contenteditable`.
- Alvos de navegação medem ao menos 36 px no desktop e 44 px em touch.
- Texto decisório não usa menos de 12 px.
- Escape fecha apenas a revelação temporária ativa e devolve foco quando aplicável.

## Limites

- Não mover domínio para `packages/*`.
- Não importar internals de outro app.
- Não adotar `@matriz/product-ui` nem o barrel raiz de `@matriz/blocks`.
- Não alterar root config, contratos públicos, manifests, eventos ou schemas.
- Não conceder score por volume de mudança; score só muda com evidência revisada.

## Critérios de conclusão

1. O painel de ecossistema é legível no Workbench dark e preserva os demais apps.
2. Todos os presets passam o gate de contraste dos pares realmente renderizados.
3. O seletor compacto exibe swatch + sigla e possui nome acessível completo.
4. O menu pode ser recolhido sem gerar links vazios; teclado e touch continuam funcionais.
5. A topbar pode ser revelada sem prender foco em controles ocultos.
6. Foco e Sites apresentam menos texto simultâneo e mantêm detalhes sob demanda.
7. Testes, lint, typecheck, build e smoke tests afetados passam.
8. A prova visual cobre desktop, mobile, temas claro/escuro e painel compartilhado aberto.
