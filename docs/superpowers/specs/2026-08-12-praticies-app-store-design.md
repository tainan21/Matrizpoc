# Praticies App Store — design

## Outcome

Transformar Praticies em uma superfície instalável de utilitários: catálogo completo,
detalhes, instalação/desinstalação, recentes e composição visual por drag-and-drop.
O Matriz Hub oferece a experiência integral e o Workbench oferece um launcher leve,
ambos consumindo as mesmas regras compartilhadas.

## Decisão arquitetural

Criar `@matriz/flows-praticies` em `packages/flows/praticies`.

O package contém somente semântica transversal e estável:

- definições do catálogo e tipos de utilitário;
- estado de instalação, recentes e layout;
- casos de uso idempotentes (`install`, `uninstall`, `recordOpen`, `saveLayout`);
- porta de persistência e adapter para `KeyValueStore`;
- catálogo padrão sem links internos de um app consumidor.

Cada app mantém:

- rotas, autenticação, textos contextuais e presenters;
- resolução de destinos locais;
- componentes e CSS alinhados ao próprio shell;
- namespace de persistência independente.

Isso cria dois consumidores reais sem importar internals entre apps. O estado é uma
preferência de interface no browser, não um artefato de projeto em `.matriz/**`.

## Modelo

`PracticeAppDefinition` é uma descrição imutável. `PracticeWorkspaceState` é um
snapshot versionado com IDs instalados, recentes únicos e cartões de layout. Um
cartão pode ser `compact` ou `wide`. Apps em preview aparecem no catálogo, mas não
podem ser instalados.

O serviço de aplicação recebe um relógio e um repositório por injeção. Assim, regras
de negócio não dependem de React, Next.js ou `localStorage`, e ficam testáveis de
forma determinística.

## Experiência

### Hub — `/praticies/apps`

Uma tela editorial densa e responsiva:

- cabeçalho com contadores e busca;
- faixa de recentes;
- catálogo filtrável por tipo e status;
- inspector de detalhes com instalar/desinstalar;
- estúdio de layout com cartões arrastáveis, alternância de tamanho, salvar e
  restaurar rascunho.

Desktop/tablet/TV usa `100dvh` e não rola a página; apenas regiões internas rolam.
No mobile, o documento volta ao fluxo vertical e pode rolar. Drag-and-drop possui
botões equivalentes para teclado e toque.

### Hub — `/praticies`

Continua sendo a mesa de execução. Ganha entrada clara para a loja e mantém a
automação Patterns existente funcionando.

### Workbench — `/praticies`

Launcher compacto dentro do shell existente: recentes, instalados e link para o
catálogo completo no Hub. Ele usa as mesmas regras e persistência, mas com namespace
próprio por causa das origens distintas (`:3000` e `:3005`).

## Leveza e segurança

- catálogo local e estático, sem fetch inicial;
- um único snapshot versionado em `localStorage`;
- limite de seis recentes;
- normalização defensiva contra estado antigo ou corrompido;
- sem código remoto, plugins executáveis, shell ou mutação de source;
- itens em preview não simulam capacidade inexistente.

## Critérios de aceite

1. Instalar e desinstalar é persistente e idempotente.
2. Aberturas recentes são únicas, ordenadas e limitadas.
3. O layout instalado pode ser reordenado, redimensionado e salvo.
4. Hub lista todos os apps e mostra detalhes sem navegação custosa.
5. Workbench consome o package compartilhado sem importar o Hub.
6. Desktop não produz scroll do documento; mobile permanece usável com scroll.
7. Testes do domínio e checks scoped dos dois apps passam.
