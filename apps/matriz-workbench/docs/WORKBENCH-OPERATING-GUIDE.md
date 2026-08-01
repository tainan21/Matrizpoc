# Workbench — operação e Controle

## Foco e Controle

**Foco** (`/`) responde “o que faço agora?”: trabalho ativo, bloqueios e fila
de solicitações. **Controle** (`/control`) responde “o que precisa ser
conferido?”: saúde das trilhas 0–100, evidências, aprovações, presenças,
notificações locais e atividade. O Controle não altera o conteúdo do Foco.

## Estrutura e dados

O Workbench descobre `apps/*/package.json` e a raiz do monorepo. Cada projeto
inicializado mantém a fonte canônica em `.matriz/**`. O modo Controle adiciona:

```text
.matriz/control/
├── policy.json
├── score-summary.json
├── evidence/*.json
├── approvals/*.json
├── entities/*.json
├── notifications/*.json
├── insights/*.json
└── snippets/*.json
```

JSON é estado automatizável; Markdown continua sendo conhecimento humano;
`activity/*.jsonl` é append-only. Escritas usam arquivo temporário + rename,
`revision` e proteção contra traversal/symlink. Não há delete permanente nem
filesystem genérico.

## Score 0–100

As trilhas App, Docs e Features/Domains permanecem independentes. O agregado
usa App 45%, Docs 30% e Features/Domains 25%. Uma meta só entra no agregado
quando existe evidência aprovada. Propostas de Codex, MCP, IA, humano ou fonte
externa ficam pendentes; checks determinísticos podem ser aprovados
automaticamente. Score não mede esforço e não é concedido por opinião.

## Rotas

- `/` — Foco;
- `/control` — Controle global, com filtro por projeto;
- `/projects` e `/projects/:id` — inventário e visão do projeto;
- `/projects/:id/roadmap` — roadmap e trilhas detalhadas;
- `/projects/:id/backlog`, `/docs`, `/agents`, `/activity` — artefatos locais;
- `/settings` — configuração local.

## Atalhos e snippets

`Ctrl/Cmd+K` abre a command palette. `G F`, `G C`, `G B` e `G S` levam a Foco,
Controle, Backlog e Score. `?` abre a ajuda; `Esc` fecha overlays. Snippets
iniciais: `/contexto-curto`, `/criterios`, `/verificacao` e `/handoff`.
Seleção e cópia são imediatas e exibem toast; ações que alteram estado exigem
confirmação/revisão explícita.

## Codex via MCP

O servidor é STDIO e publica resources `matriz://projects/{id}/control` e
`matriz://projects/{id}/score`. Tools de leitura incluem snapshot, score,
evidências, aprovações, entidades, notificações e snippets. Tools de escrita
(`workbench_propose_score_evidence`, `workbench_review_score_evidence`,
`workbench_mark_control_notification`, `workbench_create_snippet` e
`workbench_update_snippet`) são nomeadas, revisionadas e devem solicitar
aprovação humana no Codex. Nenhuma tool edita `src/**`, executa shell ou aceita
caminho arbitrário.

Fluxo recomendado: ler o guide e o snapshot compacto; abrir somente a tarefa e
documentos referenciados; trabalhar com as permissões normais do Codex; propor
evidência; aguardar revisão; registrar resumo, arquivos e checks na activity.

## Validação

```powershell
pnpm --filter @matriz/app-matriz-workbench test
pnpm --filter @matriz/app-matriz-workbench typecheck
pnpm --filter @matriz/app-matriz-workbench lint
pnpm --filter @matriz/app-matriz-workbench build
pnpm --filter @matriz/app-matriz-workbench verify:mcp
pnpm --filter @matriz/app-matriz-workbench health
```

O tema é consumido por tokens semânticos do app. Tokyo Night é o preset visual
preferido; Dracula é alternativa. Ambos devem manter contraste AA, foco visível
e `prefers-reduced-motion`.
