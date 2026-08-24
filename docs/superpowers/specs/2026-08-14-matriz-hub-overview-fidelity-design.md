# Matriz-Hub Overview Fidelity — design

## Objetivo

Reinterpretar a Visão Geral do Matriz-Hub segundo a composição da referência fornecida em 14/08/2026: mapa operacional dominante, navegação e dock persistentes, inspetor contextual, informação compacta e expansão localizada. As demais rotas recebem a mesma gramática através dos primitives e CSS app-local.

## Tese visual, conteúdo e interação

- **Visual:** centro operacional noturno com mapa espacial luminoso, superfícies por profundidade e bordas reservadas a foco e estrutura.
- **Conteúdo:** orientação compacta, mapa de apps, entidade selecionada, fontes reais, atividade, atenção e mudanças locais.
- **Interação:** hover aproxima, clique seleciona, expandir cria foco e `Esc` restaura o panorama.

## Composição

- A barra superior, sidebar integral e dock seguem a densidade da referência.
- O banner editorial atual é removido e substituído por breadcrumb e toolbar locais.
- O centro é ocupado pelo mapa de apps e integrações.
- O inspetor mostra propriedades reais do nó selecionado.
- O deck inferior contém fluxo das fontes, atividade, atenção, mudanças e atores recentes.
- Em 1680×939 e 1440×900, o documento não rola; regiões internas podem rolar ou expandir.

## Fontes e honestidade

- Nós: apps habilitados do registry.
- Arestas: integrações declaradas em manifests; targets desconhecidos não geram nós.
- Saúde: registry institucional.
- Atividade: EventBus e telemetria da sessão.
- Mudanças e atores: `.matriz/activity`; ausência mantém estado vazio.
- Footer: Registry, snapshot, EventBus, telemetria, ambiente, persistência e hora.
- CPU, memória, rede, branch, região, tarefas, revisores e serviços internos não são inventados.

## Visualização híbrida

- `Auto` usa Three.js em desktop WebGL e SVG/DOM em dispositivos menores.
- `3D` e `2D` podem ser escolhidos e lembrados localmente.
- Níveis `Resumo`, `Operação` e `Detalhe` controlam rótulos e densidade.
- Canvas usa geometria simples, DPR limitado e renderização sob demanda.
- Falha de carregamento ou WebGL aciona fallback equivalente.
- Nós possuem representação DOM navegável por teclado e leitor de tela.

## Gramática global

- Descrições de headers compartilhados migram para `InfoHint`.
- Cards passivos viram layout, faixa ou lista.
- Cor, forma e texto curto distinguem estado.
- Superfícies separam regiões antes de qualquer borda.
- Praticies mantém seu shell imersivo.

## Responsividade

- ≥1440: mapa, inspetor e deck simultâneos.
- 1024–1439: inspetor mais estreito e deck recolhível.
- 768–1023: 2D por padrão e inspetor em sheet.
- <768: mapa DOM vertical, controles compactos e fluxo rolável.

## Dependências

- `three@0.185.1`
- `@react-three/fiber@9.7.0`
- `@react-three/drei@10.7.8`

As dependências entram somente em `apps/matriz-hub`; nenhuma primitive é promovida a package compartilhado.

## Critérios de aceite

- ViewModel não fabrica entidades ou estados.
- Mapa seleciona `matriz-hub` quando disponível.
- 3D é lazy e não aparece no tráfego de outras rotas.
- 2D, WebGL indisponível, teclado, toque, expansão, `Esc` e reduced-motion funcionam.
- Visão Geral não possui overflow ou scroll documental em desktop alvo.
- Projetos, Arquitetura, Eventos, MatrizDocs, Roadmap e Praticies passam por revisão visual.
- Typecheck, lint, testes e build do Hub passam.

