# Prompt mestre — reforma visual do Matriz Workbench

Use este prompt para uma rodada independente de agente dentro de `C:\Apps\matriz-infra-hub`.

```text
Trabalhe no Matriz Workbench com autonomia para planejar e executar a frente atribuída, sem pedir nova aprovação para decisões reversíveis dentro do escopo.

Antes de agir, leia nesta ordem:
1. docs/architectural-laws.md
2. docs/monorepo-structure.md
3. docs/app-communication.md
4. apps/matriz-workbench/AGENTS.md
5. apps/matriz-workbench/docs/AGENT-START-HERE.md
6. apps/matriz-workbench/docs/agent-handbook/README.md e capítulos 01–07
7. apps/matriz-workbench/README.md
8. apps/matriz-workbench/src/manifest/manifest.ts
9. apps/matriz-workbench/src/bootstrap/index.ts
10. apps/matriz-workbench/docs/design/WORKBENCH-VISUAL-REFORM-2026-08-04.md
11. apps/matriz-workbench/docs/plans/2026-08-04-workbench-visual-reform-implementation.md

Objetivo:
Corrigir contraste real no dark, reduzir poluição textual e provar um shell inteligente com temas compactos, informação sob demanda e Sites como superfície de comunicação.

Regras duras:
- Trabalhe somente na frente e nos arquivos atribuídos.
- Nunca importe apps/<outro-app>/src/** ou apps/<outro-app>/app/**.
- UI consome ViewModels; não renderize entities novas diretamente.
- Não mova domínio de app para package compartilhado.
- Não importe nem copie @matriz/product-ui; use C:\Apps\matrizlibUI apenas como referência read-only.
- Shared design pode conter apenas base visual genérica e precisa de dois ou mais consumidores reais.
- Não edite root config, env, manifest, eventos ou contratos públicos nesta rodada.
- Não versione .env, logs, screenshots temporários, build output ou caches.

Processo:
1. Faça diagnóstico e declare uma hipótese única.
2. Escreva teste de regressão e confirme a falha.
3. Implemente a menor mudança que resolve a hipótese.
4. Rode os testes da frente.
5. Revise o diff e os limites arquiteturais.
6. Informe causa, arquivos, checks, riscos e próximo estado.

Critérios visuais:
- texto normal >= 4,5:1; foco/componentes >= 3:1;
- texto decisório >= 12px;
- rail recolhido mantém nomes acessíveis e rota atual;
- hover tem equivalente por foco/toque;
- prefers-reduced-motion não esconde controles por tempo;
- tema compacto mostra swatch + sigla, nunca cor sozinha.

Validação padrão:
pnpm --filter @matriz/app-matriz-workbench lint
pnpm --filter @matriz/app-matriz-workbench typecheck
pnpm --filter @matriz/app-matriz-workbench test
pnpm --filter @matriz/app-matriz-workbench build

Se tocar packages/design ou packages/flows, rode também:
pnpm test:smoke

Não altere roadmap ou score automaticamente. Registre atividade e evidência; deixe validação humana e score separados.
```

## Frentes indicadas

1. Contrato de cor e painel compartilhado.
2. Aparência, siglas e contraste dos presets.
3. Rail recolhível e topbar adaptativa.
4. Presenters, microcopy e disclosure progressivo.
5. Sites e prova visual responsiva.

Agentes paralelos não devem editar o mesmo arquivo. O agente principal integra os diffs e executa a validação completa.
