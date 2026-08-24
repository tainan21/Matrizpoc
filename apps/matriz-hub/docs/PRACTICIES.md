# Praticies — bancada de utilidades do Matriz Hub

## Objetivo

`/praticies` concentra automações pequenas, snippets, atalhos e gadgets que
reduzem atrito operacional. `/praticies/apps` é a loja e o estúdio visual dessa
superfície. O nome **Praticies** permanece como identidade de produto.

O primeiro utilitário é **Project patterns**: ele lê somente diretórios do
workspace e grava dois mapas em `.patterns/` na raiz do monorepo:

- `folders.human.md`: árvore comentada, limites de apps/packages e sumário de
  camadas para leitura humana;
- `folders.llm.json`: representação normalizada, com IDs, relações pai-filho,
  tags, contagens e fronteiras, própria para recuperação por agentes.

## Tese de produto e visual

- **Tese visual:** uma bancada operacional de papel técnico, tipografia direta
  e sinalização verde; densa, calma e precisa.
- **Plano de conteúdo:** catálogo à esquerda, superfície de trabalho no centro
  e evidência/output à direita.
- **Tese de interação:** seleção troca a ferramenta sem navegação; a ação de
  patterns comunica progresso no próprio botão; hover e foco reforçam linhas e
  direção sem animação ornamental.

Em desktop, tablet e televisão, a superfície ocupa `100vw × 100dvh` e não
depende de scroll. A rota é removida do `HubShell` pelo auth adoption, mas
continua protegida pelo `AuthGate`. Em telas de até 640 px, o layout passa a ser
vertical e o scroll é permitido para preservar legibilidade e área de toque.

## Arquitetura

```text
app/praticies/page.tsx
  -> application/inspectProjectPatterns
  -> presentation/toPatternGenerationVM
  -> PraticiesWorkbench (ViewModel apenas)

botão "Gerar patterns"
  -> Server Action
  -> application/generateProjectPatterns
  -> PatternsGenerator (porta de domínio)
  -> integration/filesystem/patterns-generator
  -> <workspace>/.patterns/*
```

Responsabilidades:

- `domain/`: contratos das praticidades e porta `PatternsGenerator`;
- `application/`: catálogo e casos de uso, sem conhecer Node ou React;
- `integration/filesystem/`: descoberta defensiva da raiz, leitura de pastas e
  escrita dos dois formatos;
- `presentation/`: conversão para ViewModels serializáveis;
- `app/praticies/`: composição RSC, interação client e Server Action;
- `app/api/praticies/patterns/[format]`: download somente dos dois artefatos
  conhecidos, sem aceitar caminho arbitrário.

O gerador Patterns permanece no Hub porque executa uma capability específica do
checkout. Instalação, recentes e layout migraram para `@matriz/flows-praticies`
depois que Hub e Workbench se tornaram dois consumidores reais. O package não
contém rotas, React, links de app ou execução de automações.

## Guardrails

1. O gerador nunca abre arquivos do projeto; somente enumera diretórios.
2. Links simbólicos não são seguidos.
3. Dependências, caches, outputs e worktrees são excluídos para evitar ruído e
   duplicação.
4. A raiz precisa conter `pnpm-workspace.yaml` e `apps/matriz-hub`.
5. A escrita é fixa em `.patterns/`; não existe input de caminho vindo do
   cliente.
6. Página, Server Action e downloads validam a sessão no servidor.
7. Em deploy sem checkout gravável, a Server Action retorna erro explícito e a
   UI preserva o último estado conhecido.

## Praticidades atuais

| Praticidade | Tipo | Estado | Resultado |
|---|---|---|---|
| Project patterns | automação | disponível | Markdown + JSON em `.patterns/` |
| Validation recipes | snippets | disponível | copia typecheck, lint e smoke |
| Project compass | atalhos | disponível | saúde, ecossistema e MatrizDocs |
| Release notes | snippet | disponível | template editorial copiável |
| Context brief | gadget | em desenho | handoff curto e versionado |

## Loja e persistência

- O catálogo é estático, renderizado sem waterfall de rede.
- Instalar/desinstalar, recentes e layout usam primeiro a Capability API. No
  modo demonstração, esse estado é efêmero e dura somente durante o processo
  do Hub; `localStorage` permanece apenas como fallback quando a API está
  indisponível, com namespace independente para Hub e Workbench.
- A loja mostra detalhes no mesmo canvas; itens em preview não fingem estar
  funcionais.
- O estúdio mantém um rascunho até “Salvar design”. Drag-and-drop possui botões
  equivalentes para teclado e toque.
- Em desktop/tablet/TV, o documento fica em `100dvh` e somente regiões internas
  rolam. No mobile, o fluxo vertical e o scroll do documento são permitidos.

## Começo, meio e fim

### Começo — tornar o script uma capability real

- mover a lógica do script raiz para uma função app-local testável;
- oferecer execução por botão com feedback e downloads;
- registrar rota/capability no manifest;
- manter o output compatível com `project-folder-map/v1`.

### Meio — transformar a rota em catálogo sustentável

- adicionar contrato de registro para novas praticidades;
- exigir owner, risco, modo de execução e formato de output;
- registrar histórico local de execuções sem armazenar conteúdo sensível;
- implementar Context brief a partir de fontes públicas e configuráveis.

### Fim — bancada confiável, não uma coleção de scripts

- permitir composição de receitas com preview e dry-run;
- adicionar permissões por categoria quando houver usuários reais;
- medir tempo economizado, taxa de sucesso e práticas mais utilizadas;
- extrair infraestrutura somente quando existir um segundo consumidor real.

## Como validar

```bash
pnpm --filter @matriz/app-matriz-hub typecheck
pnpm --filter @matriz/app-matriz-hub lint
pnpm test:smoke
```

Validação manual mínima:

1. autenticar no Hub e abrir `/praticies`;
2. gerar patterns e conferir contagem, data e dois downloads;
3. verificar que o JSON tem `format: project-folder-map/v1`;
4. testar as larguras 1440, 1024, 768 e 390 px;
5. confirmar ausência de scroll nas três primeiras e scroll vertical em 390 px.
