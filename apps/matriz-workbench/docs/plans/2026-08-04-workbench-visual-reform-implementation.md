# Workbench Visual Reform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a primeira reforma visual verificável do Workbench, corrigindo dark mode, reduzindo ruído e introduzindo shell e aparência adaptativos sem violar boundaries.

**Architecture:** O contrato genérico de cores é endurecido no componente compartilhado e o Workbench publica aliases derivados de seus presets app-local. Interações novas ficam em componentes client pequenos; dados e rótulos continuam vindo de presenters. A referência Matriz Lib UI não vira dependência.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6, CSS Modules/CSS custom properties, Vitest 2, Playwright CLI.

## Global Constraints

- Nunca importar `apps/<outro-app>/src/**` ou `apps/<outro-app>/app/**`.
- Não criar package novo nesta rodada.
- Não importar `@matriz/product-ui` ou barrel amplo da Matriz Lib UI.
- Texto normal deve alcançar 4,5:1; foco e componentes, 3:1.
- Hover deve possuir equivalente por foco ou toque.
- Não alterar roadmap ou score automaticamente.

---

### Task 1: Contrato de cores renderizado

**Files:**
- Modify: `apps/matriz-workbench/src/ui/theme-presets.ts`
- Modify: `apps/matriz-workbench/src/ui/theme.test.ts`
- Modify: `packages/design/ui/src/ecosystem-bar.tsx`
- Create: `tests/smoke/design-theme-contract.test.ts`
- Modify: `apps/matriz-workbench/app/globals.css`

**Interfaces:**
- Produces: aliases genéricos `--surface-fg`, `--color-foreground`, `--color-surface`, `--color-background`, `--color-border`, `--accent-fg`.
- Consumes: tokens `WorkbenchThemeTokens` já existentes.

- [ ] **Step 1: Escrever testes que falham para aliases e fallbacks simétricos**

Adicionar assertions que exigem que `getAppearanceVariables("dark", preset.id)` publique foreground e background genéricos equivalentes aos tokens `--wb-*`, e que o estilo do painel compartilhado tenha fallback final por `--text` antes de literal.

- [ ] **Step 2: Rodar os testes e confirmar a falha pelo alias ausente**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/theme.test.ts`
Run: `pnpm test:smoke -- tests/smoke/design-theme-contract.test.ts`

- [ ] **Step 3: Publicar os aliases e corrigir pares reais**

Mapear `surface/text/border/accent` a partir de `WorkbenchThemeTokens`. Substituir branco literal por `var(--wb-accent-text)` apenas em marca, ação primária, meta completa e unlock. Corrigir botão base, skip link e superfícies claras comprovadas para declarar background e foreground como par.

- [ ] **Step 4: Endurecer o `EcosystemBar` sem conhecer Workbench**

Usar `var(--color-foreground, var(--surface-fg, var(--text, #111827)))` para foreground e o fallback simétrico de surface/border. Não adicionar `--wb-*` ao package.

- [ ] **Step 5: Rodar testes do app e smoke**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/theme.test.ts`
Run: `pnpm test:smoke`

### Task 2: Aparência compacta e InfoHint

**Files:**
- Modify: `apps/matriz-workbench/src/ui/theme-presets.ts`
- Modify: `apps/matriz-workbench/src/ui/theme.test.ts`
- Modify: `apps/matriz-workbench/src/ui/components/theme-system-picker.tsx`
- Modify: `apps/matriz-workbench/src/ui/components/theme-system-picker.module.css`
- Create: `apps/matriz-workbench/src/ui/components/info-hint.tsx`
- Create: `apps/matriz-workbench/src/ui/components/info-hint.module.css`

**Interfaces:**
- Produces: `WorkbenchThemePreset.shortLabel` e `InfoHint({ label, children })`.
- Consumes: `WORKBENCH_THEME_PRESETS` e cookies de aparência existentes.

- [ ] **Step 1: Escrever teste que exige dez siglas únicas de duas letras**

Esperar `DF, NB, MG, PL, AU, ZN, PU, TR, DR, GL`, sem duplicatas.

- [ ] **Step 2: Confirmar RED no teste de tema**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/theme.test.ts`

- [ ] **Step 3: Adicionar `shortLabel` e redesenhar o compacto**

O gatilho compacto mostra swatch e sigla; o nome acessível segue `Aparência: <modo>, <nome completo>`. A galeria mantém label e descrição completas.

- [ ] **Step 4: Criar `InfoHint` sem informação essencial exclusiva**

Usar disclosure focável/touch, conteúdo com `role="tooltip"`, fechamento por perda de foco/hover e CSS respeitando movimento reduzido.

- [ ] **Step 5: Confirmar GREEN**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/theme.test.ts`

### Task 3: Shell recolhível e topbar adaptativa

**Files:**
- Create: `apps/matriz-workbench/src/ui/shell-preferences.ts`
- Create: `apps/matriz-workbench/src/ui/shell-preferences.test.ts`
- Create: `apps/matriz-workbench/src/ui/components/shell-chrome.tsx`
- Create: `apps/matriz-workbench/src/ui/components/shell-chrome.module.css`
- Modify: `apps/matriz-workbench/src/ui/components/app-shell.tsx`
- Modify: `apps/matriz-workbench/app/(workspace)/layout.tsx`
- Modify: `apps/matriz-workbench/app/globals.css`

**Interfaces:**
- Produces: `RailPreference = "expanded" | "collapsed"`, `TopbarPreference = "auto" | "pinned"`, normalizadores e cookies app-local.
- Consumes: slots React server-rendered de rail, topbar e workspace.

- [ ] **Step 1: Testar normalização segura das preferências**

Valores inválidos retornam `collapsed` para rail e `auto` para topbar; valores válidos são preservados.

- [ ] **Step 2: Confirmar RED**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/shell-preferences.test.ts`

- [ ] **Step 3: Implementar `ShellChrome` como única fronteira client**

Persistir cookies, expor botões com `aria-expanded`/`aria-controls`, manter rail curto com expansão temporária por hover/foco e topbar revelável por sentinel. Não buscar projetos nem executar repository no client.

- [ ] **Step 4: Corrigir navegação ativa e breakpoint quebrado**

Usar `usePathname` somente na fronteira client ou em item app-local para aplicar `aria-current`. Remover a regra genérica que oculta todos os `span`; ocultar apenas `.nav-label` visualmente no estado collapsed.

- [ ] **Step 5: Proteger toque e movimento reduzido**

Em `hover: none`, `pointer: coarse`, viewport pequena ou `prefers-reduced-motion`, manter topbar visível e fornecer toggle explícito do menu.

- [ ] **Step 6: Confirmar GREEN**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/shell-preferences.test.ts`

### Task 4: Foco por ViewModel e microcopy

**Files:**
- Create: `apps/matriz-workbench/src/ui/presenters/focus-presenter.ts`
- Create: `apps/matriz-workbench/src/ui/presenters/focus-presenter.test.ts`
- Modify: `apps/matriz-workbench/app/(workspace)/page.tsx`
- Modify: `apps/matriz-workbench/src/ui/components/command-menu.tsx`

**Interfaces:**
- Produces: `FocusWorkItemViewModel` com `statusLabel`, `priorityLabel`, `shortReference`, `fullReference`, `projectLabel`.
- Consumes: `BacklogItem`, `AgentRequest` e `ProjectNavViewModel` somente no presenter.

- [ ] **Step 1: Testar rótulos, referência curta e preservação do ID completo**

Casos mínimos: `in_progress -> Em andamento`, `review -> Em revisão`, referência terminando nos seis caracteres úteis e ID completo separado.

- [ ] **Step 2: Confirmar RED**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/presenters/focus-presenter.test.ts`

- [ ] **Step 3: Implementar presenter e aplicar na home**

Trocar enum cru e ID completo visível por rótulo localizado e referência curta. Usar `aria-label`/title apenas como complemento, nunca como única informação.

- [ ] **Step 4: Proteger atalhos em campos editáveis**

Antes de processar sequências `G …`, retornar quando o target for input, textarea, select ou contenteditable.

- [ ] **Step 5: Confirmar GREEN**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/presenters/focus-presenter.test.ts`

### Task 5: Sites como comunicação visual

**Files:**
- Modify: `apps/matriz-workbench/app/(workspace)/sites/page.tsx`
- Modify: `apps/matriz-workbench/app/globals.css`

**Interfaces:**
- Consumes: `SiteSummary` já projetado pelo `SiteCatalogBridge`.
- Produces: nenhum contrato novo; somente apresentação app-local.

- [ ] **Step 1: Caracterizar os dados já disponíveis**

Confirmar que a página usa apenas `id`, `name`, `status`, `presetId`, `locales` e `metadataCompleteness`.

- [ ] **Step 2: Reorganizar a página em blocos operacionais compactos**

Exibir estado, barra de completude, idiomas e ações `Backlog`/`Preview`. Mover explicações de runtime e metadata para `InfoHint`.

- [ ] **Step 3: Verificar bridge existente**

Run: `pnpm --filter @matriz/app-matriz-workbench test -- src/integration/sites/site-catalog-bridge.test.ts`

### Task 6: Validação integrada e documentação operacional

**Files:**
- Modify: `apps/matriz-workbench/docs/design/WORKBENCH-VISUAL-REFORM-2026-08-04.md` somente se a implementação divergir de forma deliberada.
- Modify: `apps/matriz-workbench/.matriz/activity/2026-08.jsonl` pelo fluxo autorizado do Workbench.

- [ ] **Step 1: Rodar validação do app**

Run: `pnpm --filter @matriz/app-matriz-workbench lint`
Run: `pnpm --filter @matriz/app-matriz-workbench typecheck`
Run: `pnpm --filter @matriz/app-matriz-workbench test`
Run: `pnpm --filter @matriz/app-matriz-workbench build`

- [ ] **Step 2: Rodar validação compartilhada**

Run: `pnpm test:smoke`

- [ ] **Step 3: Prova real no navegador**

Validar 390×844, 768×1024, 1280×800 e 1440×900 em light/dark; abrir o painel de ecossistema; alternar `MG`, `DR` e `ZN`; operar rail, topbar, teclado e touch; confirmar estilos computados de foreground/background.

- [ ] **Step 4: Registrar atividade sem alterar score automaticamente**

Registrar causa, arquivos, checks e limitações. Deixar a tarefa em revisão e manter decisão de score separada.
