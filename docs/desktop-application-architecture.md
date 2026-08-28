# Arquitetura de aplicações desktop

> Fonte canônica para escolha e migração de runtimes desktop no ecossistema
> Matriz. Este documento complementa as leis arquiteturais; ele não autoriza
> imports entre apps nem desloca domínio de produto para packages.

O estado comprovado e a classificação de cada app ficam em
`docs/application-runtime-inventory.md`. Este documento define a regra; o
inventário registra onde cada aplicação está sem transformar implementação
existente em exceção automática.

## Política vigente

O ecossistema é **Tauri-first, Electron-by-exception**.

- Toda nova aplicação ou edição desktop começa com Tauri como hipótese
  arquitetural.
- Electron exige uma decisão explícita e evidência de uma necessidade que
  Tauri/WebView2 não atende adequadamente.
- Uma aplicação web ou serviço não precisa ganhar uma edição desktop apenas
  para uniformizar o ecossistema.
- Uma implementação Electron existente não se torna exceção permanente só
  porque já foi entregue.
- Tauri e Electron não devem manter indefinidamente a mesma responsabilidade
  sem objetivo, critérios de comparação e data de revisão.

Tauri é o padrão porque favorece baixo custo ocioso, distribuição compacta e
integração nativa sem incorporar automaticamente outro runtime Chromium/Node.
Isso é uma preferência arquitetural, não uma proibição dogmática de Electron.

## Quando considerar Electron

Electron pode ser proposto quando houver requisito concreto e verificável,
principalmente em superfícies profundamente dependentes de:

- Chromium controlado pelo produto;
- automação de navegador ou perfis/sessões browser isolados;
- APIs ou módulos Node indispensáveis no processo desktop;
- compatibilidade Electron que não possua alternativa segura e sustentável no
  WebView2/Tauri.

Familiaridade da equipe, conveniência inicial, reaproveitamento de um shell
antigo ou presença de Electron em outra branch não são justificativas
suficientes.

## Registro de exceção

Antes de introduzir uma nova dependência, shell ou workflow Electron, registre
em `docs/DECISION-LOG.md`:

1. app e owner da decisão;
2. requisito técnico que impede ou prejudica materialmente Tauri;
3. evidência reproduzível, benchmark ou limitação funcional observada;
4. alternativas avaliadas;
5. superfície privilegiada e controles de segurança;
6. impacto em build, distribuição, atualização e suporte;
7. condição e data de revisão.

Sem esse registro, a proposta permanece Tauri. Uma exceção pertence ao app;
ela não cria um framework Electron compartilhado nem precedente automático
para outros produtos.

## Código existente e migração

As edições Electron existentes permanecem operáveis até uma avaliação
app-local. Não remova runtime, updater, instalador ou workflow antes de existir
uma alternativa verificada e um caminho de rollback.

Cada avaliação deve classificar o app como:

- **Tauri confirmado** — runtime atual ou migração aprovada;
- **Electron justificado** — exceção registrada com evidência e revisão;
- **Electron provisório** — implementação preservada enquanto a decisão é
  investigada;
- **web/serviço** — nenhuma edição desktop necessária neste momento.

Migrações são incrementais. Preserve contratos, ViewModels e regras de domínio
app-locais; migre uma capacidade por vez; teste empacotamento, instalação,
atualização, dados e rollback; remova o runtime anterior somente depois da
paridade relevante. Não crie package compartilhado até existirem dois
consumidores reais e uma superfície estável sem domínio forte.

## Branches e worktrees

Branch, worktree, commit ou prompt antigo é fonte de evidência, não autoridade
arquitetural. Antes de portar código:

1. identifique a intenção e os commits relevantes;
2. compare com a baseline e as decisões vigentes;
3. classifique como migrar, adaptar, referência, obsoleto ou investigar;
4. prefira commit isolado ou reimplementação app-local a merge de árvore;
5. preserve trabalho não rastreado ou não consolidado quando houver dúvida.

Documentação conflitante deve ser marcada como histórica ou substituída no
mesmo incremento que consolida a nova decisão.

## Verificação proporcional

- Mudança apenas de governança: valide links e paths, coerência entre fontes
  canônicas e `git diff --check`.
- Mudança app-local: execute testes, lint, typecheck e build do app.
- Mudança Tauri: acrescente `cargo fmt --check`, testes Rust, Clippy e pacote do
  alvo suportado.
- Mudança em manifest, contrato, package compartilhado, tooling ou CI: aplique
  também os gates globais definidos em `docs/CHANGE-SAFETY.md`.
