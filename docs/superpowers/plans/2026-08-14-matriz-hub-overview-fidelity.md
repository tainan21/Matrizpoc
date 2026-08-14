# Matriz-Hub Overview Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a Visão Geral em um ambiente espacial fidedigno à referência e aplicar a nova gramática visual aos primitives compartilhados do Matriz-Hub.

**Architecture:** O source server-side agrega registry, manifests, saúde institucional, sessão e atividade local em um ViewModel serializável. Um workspace cliente seleciona nós, controla expansão e escolhe entre um mapa SVG/DOM e uma cena Three.js carregada dinamicamente. Headers, métricas, contexto e superfícies continuam app-local e mudam todas as rotas sem alterar contratos externos.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Three.js, React Three Fiber, Drei, SVG e CSS app-local.

## Global Constraints

- Alterar apenas `apps/matriz-hub`, os dois documentos desta sprint e o lockfile necessário às dependências.
- Preservar worktree sujo e usar staging explícito.
- Não inventar dados, estados, atores ativos ou telemetria.
- UI continua consumindo ViewModels.
- Three.js é lazy e possui fallback SVG/DOM.
- Praticies permanece imersivo.

---

### Task 1: Documentação canônica

**Files:** manual app-local, spec e este plano.

- [ ] Escrever manual, spec e plano sem placeholders.
- [ ] Revisar consistência, escopo e exemplos.
- [ ] Rodar `git diff --check` nos três documentos.
- [ ] Commitar como `docs(hub): define overview fidelity manual`.

### Task 2: ViewModel espacial com TDD

**Files:** presenter, source, tipos e teste existentes da Visão Geral.

**Produces:** `HubGraphNodeVM`, `HubGraphEdgeVM`, mudanças, atores e `HubOverviewVM.graph`.

- [ ] Escrever testes que exijam nós reais, arestas válidas, seleção padrão e ausência explícita de saúde.
- [ ] Executar o teste e confirmar falha pelo contrato ausente.
- [ ] Implementar o mínimo no presenter e source.
- [ ] Executar teste focado e suíte de presenters.
- [ ] Commitar como `feat(hub): present spatial overview data`.

### Task 3: Primitives globais e gramática visual

**Produces:** `InfoHint`, novos ícones e headers compactos mantendo as props públicas existentes.

- [ ] Adicionar teste para preferência visual `auto | 3d | 2d` e confirmar falha.
- [ ] Implementar parser de preferência e primitives.
- [ ] Atualizar `OperationalPageHeader`, `DocsHeader`, métricas, contexto, estados e tokens.
- [ ] Reduzir bordas/cards globais sem tocar domínio ou APIs.
- [ ] Validar rotas representativas e commitar como `feat(hub): apply operational visual grammar`.

### Task 4: Workspace espacial 2D e 3D

**Produces:** workspace cliente, fallback SVG/DOM, cena lazy e toolbar `Auto/3D/2D`.

- [ ] Adicionar dependências Three ao app preservando alterações existentes do package e lockfile.
- [ ] Implementar seleção, nível de detalhe, expansão e restauração por `Esc`.
- [ ] Implementar fallback acessível e minimapa SVG.
- [ ] Implementar cena R3F com controles, DPR limitado e frameloop sob demanda.
- [ ] Integrar fallback de WebGL e reduced-motion.
- [ ] Rodar typecheck/testes e commitar como `feat(hub): add hybrid spatial map`.

### Task 5: Recomposição da Visão Geral e shell

- [ ] Substituir banner e mosaico pela orientação compacta, canvas e inspetor.
- [ ] Criar deck inferior expansível com fontes, atividade, atenção, mudanças e atores reais.
- [ ] Ajustar sidebar e dock às proporções da referência.
- [ ] Implementar breakpoints desktop, notebook, tablet e mobile.
- [ ] Validar teclado, toque, tooltips e expansão.
- [ ] Commitar como `feat(hub): compose faithful operational overview`.

### Task 6: QA e fechamento

- [ ] Aplicar revisão de boas práticas React aos TSX alterados.
- [ ] Executar QA em 1680×939, 1440×900, 1024×768, 768×1024 e 390×844.
- [ ] Verificar 3D/2D, WebGL bloqueado, reduced-motion, `Esc`, overflow e ausência de scroll desktop.
- [ ] Revisar Visão Geral, Projetos, Arquitetura, Eventos, MatrizDocs, Roadmap e Praticies.
- [ ] Confirmar que rotas fora da home não baixam o chunk Three.
- [ ] Rodar lint, typecheck, Vitest completo e build do Hub.
- [ ] Corrigir apenas falhas reproduzidas e repetir a verificação completa.

