# Visual Route Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir e validar 216 capturas das 101 rotas dos sete apps, um relatório visual por rota e um protocolo de 100 componentes para evolução da `@matriz/design-ui`.

**Architecture:** A captura será orientada por um manifesto único de rotas e executada contra os apps locais nas portas 3000–3006. A automação produzirá artefatos ignorados pelo Git; o relatório versionado resumirá evidências observadas sem alterar o comportamento dos apps.

**Tech Stack:** Next.js, pnpm/Turborepo, Playwright CLI, PowerShell, Markdown e Git.

## Global Constraints

- Capturar 101 rotas em desktop `1440×1000` e mobile `390×844`.
- Capturar exatamente duas rotas-chave por app em TV `1920×1080`, totalizando 14 imagens e no máximo 216 capturas.
- Limitar cada combinação rota/viewport a duas tentativas.
- Incluir os cinco `/login` e o `/unlock` do Workbench.
- Não versionar cookies, logs, segredos, caches ou artefatos temporários.
- Não alterar os apps para fabricar estados de screenshot.
- Não mover domínio forte para packages; componentes compartilhados exigem dois consumidores reais e API estável.

---

## File Map

- `tooling/visual-audit/routes.mjs`: descoberta determinística das 101 rotas, portas, slugs, resolução/fallback de IDs dinâmicos e seleção TV.
- `tooling/visual-audit/capture.mjs`: valida o manifesto, abre cada viewport, aplica autenticação local documentada, captura e registra falhas limitadas.
- `tooling/visual-audit/verify.mjs`: confere contagem, dimensões, duplicatas, rotas ausentes e referências do relatório.
- `output/visual-route-audit/`: imagens e logs de execução locais, ignorados pelo Git.
- `docs/visual-route-audit-2026-08-17.md`: relatório versionado com 101 análises, protocolo de componentes e estratégia de migração.

### Task 1: Piloto visual do login do Hub

**Files:**

- Create: `output/visual-route-audit/matriz-hub/desktop/login.png`
- Create: `output/visual-route-audit/matriz-hub/mobile/login.png`
- Create: `docs/visual-route-audit-2026-08-17.md`

**Interfaces:**

- Consumes: `http://127.0.0.1:3000/login` e o layout real de `apps/matriz-hub`.
- Produces: modelo aprovado de seção Markdown para as outras 100 rotas.

- [ ] **Step 1: Iniciar somente o Hub e confirmar readiness**

Run: `pnpm --filter @matriz/app-matriz-hub dev`

Expected: `GET http://127.0.0.1:3000/login` responde sem erro fatal.

- [ ] **Step 2: Capturar desktop**

Run: `playwright-cli --session matriz-audit open http://127.0.0.1:3000/login`, depois `resize 1440 1000` e `screenshot --filename=output/visual-route-audit/matriz-hub/desktop/login.png`.

Expected: PNG legível com dimensões `1440×1000`.

- [ ] **Step 3: Capturar mobile**

Run: `playwright-cli --session matriz-audit resize 390 844`, recarregar e salvar `output/visual-route-audit/matriz-hub/mobile/login.png`.

Expected: PNG legível com dimensões `390×844`.

- [ ] **Step 4: Inspecionar as duas imagens e escrever a amostra**

Escrever uma entrada numerada com: intenção, conceito, contexto, conteúdo esperado, pontos fortes, pontos fracos e recomendação. Cada afirmação visual deve estar apoiada no que aparece nas imagens.

- [ ] **Step 5: Apresentar o piloto antes do lote**

Expected: o usuário consegue comparar desktop/mobile e aprovar ou ajustar o formato antes das outras 214 capturas.

### Task 2: Manifesto completo e estados navegáveis

**Files:**

- Create: `tooling/visual-audit/routes.mjs`
- Create: `tooling/visual-audit/verify.mjs`

**Interfaces:**

- Consumes: todos os `apps/*/app/**/page.tsx`, manifests e documentação local dos sete apps.
- Produces: 101 objetos `{ index, app, host, port, pattern, route, slug, access, tv, segmentResolution }` e validação executável.

- [ ] **Step 1: Extrair e normalizar as páginas**

Run: `rg --files apps -g 'page.tsx'`

Expected: 101 páginas, distribuídas entre os sete apps.

- [ ] **Step 2: Resolver rotas dinâmicas e autenticação**

Para cada segmento dinâmico, tentar um identificador navegável dos dados locais; no Workbench, resolver `projectId` antes de procurar `itemId`, `requestId` e `kind/slug` nas páginas filhas. Usar fallback `sample-*` somente quando não houver link navegável e registrar cada segmento como `source: resolved|fallback`, sem armazenar credenciais.

- [ ] **Step 3: Selecionar duas rotas TV por app**

Marcar exatamente 14 entradas `tv: true`, priorizando dashboard/home e uma superfície densa ou operacional.

- [ ] **Step 4: Implementar e rodar validação do manifesto**

Run: `node tooling/visual-audit/verify.mjs --manifest-only`

Expected: `101 routes; 6 access routes; 14 TV routes; 0 duplicate URLs`.

- [ ] **Step 5: Commitar o manifesto**

Run: `git add tooling/visual-audit/routes.mjs tooling/visual-audit/verify.mjs && git commit -m "test(audit): define visual route manifest"`

### Task 3: Captura limitada e reproduzível

**Files:**

- Create: `tooling/visual-audit/capture.mjs`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `tooling/visual-audit/routes.mjs`.
- Produces: PNGs em `output/visual-route-audit/<app>/<viewport>/<slug>.png` e `capture-results.json` sem segredos.

- [ ] **Step 1: Criar checagens do runner**

O runner deve rejeitar manifesto diferente de 101 rotas, viewport desconhecido e viewport duplicado. Tentativas são cumulativas em `--retry-failed`: resultado que já consumiu duas não volta à fila. O verifier rejeita destino fora do caminho determinístico em `output/visual-route-audit`.

Resolver `playwright` nesta ordem: `PLAYWRIGHT_NODE_MODULES` explícito, dependência já resolvível no monorepo e cache `_npx` mais recente. O canal padrão `chrome` exige Google Chrome instalado; `--channel=chromium` usa o Chromium gerenciado pelo Playwright quando seus binários estiverem instalados.

- [ ] **Step 2: Implementar navegação e captura**

Usar um contexto isolado por viewport, compartilhando apenas a sessão mock intencional dos apps em `localhost`; esperar estabilização de fontes/conteúdo, registrar status HTTP/URL final e capturar o viewport exato sem modificar o DOM.

- [ ] **Step 3: Implementar limite de tentativas**

Cada `{app, pattern, viewport}` recebe no máximo duas tentativas cumulativas; a segunda só ocorre após falha técnica. `--retry-failed` mescla o novo resultado ao índice existente, ignora sucessos e não repete falha que já chegou a duas tentativas. Lotes normais separados substituem apenas os viewports solicitados e preservam os demais.

- [ ] **Step 4: Garantir que artefatos permaneçam ignorados**

Run: `git check-ignore output/visual-route-audit/capture-results.json`

Expected: o arquivo é ignorado.

- [ ] **Step 5: Commitar a automação**

Run: `git add tooling/visual-audit/capture.mjs .gitignore && git commit -m "feat(audit): automate bounded route captures"`

### Task 4: Executar as 216 capturas

**Files:**

- Create: `output/visual-route-audit/**`

**Interfaces:**

- Consumes: sete apps locais e o runner da Task 3.
- Produces: 202 imagens web/mobile, 14 imagens TV e resultados de falha observável.

- [ ] **Step 1: Iniciar os sete apps**

Run: `pnpm run dev`

Expected: portas 3000–3006 prontas e nenhum panic do Turbopack.

- [ ] **Step 2: Capturar desktop e mobile**

Run: `node tooling/visual-audit/capture.mjs --viewports=desktop,mobile --channel=chrome`

Expected: 202 resultados terminais, incluindo falhas documentadas após no máximo duas tentativas.

- [ ] **Step 3: Capturar TV**

Run: `node tooling/visual-audit/capture.mjs --viewports=tv --channel=chrome`

Expected: 14 resultados terminais.

- [ ] **Step 4: Verificar artefatos**

Run: `node tooling/visual-audit/verify.mjs --artifacts`

Expected: 216 resultados `ok`, cobertura única e exata de 101 desktop + 101 mobile + 14 TV, manifesto/status/URL final/arquivo coerentes e todas as dimensões PNG corretas.

- [ ] **Step 5: Encerrar os processos controladamente**

Expected: nenhuma porta 3000–3006 permanece pertencendo aos processos iniciados pela auditoria.

### Task 5: Relatório das 101 rotas

**Files:**

- Modify: `docs/visual-route-audit-2026-08-17.md`

**Interfaces:**

- Consumes: manifesto, PNGs e `capture-results.json`.
- Produces: 101 entradas numeradas, navegáveis e contextualizadas.

- [ ] **Step 1: Dividir análise em lotes independentes por app**

Usar agentes apenas para leitura e redação de lotes não sobrepostos; o agente principal mantém numeração, terminologia e revisão final.

- [ ] **Step 2: Preencher cada entrada**

Cada rota deve conter links desktop/mobile e TV quando aplicável, além de intenção, conceito, contexto, conteúdo esperado, pontos fortes, pontos fracos e uma recomendação concreta.

- [ ] **Step 3: Registrar bloqueios honestamente**

Redirecionamento, autenticação indisponível, erro ou estado vazio devem aparecer como evidência da rota, com URL final e causa observada; não inferir conteúdo visual inexistente.

- [ ] **Step 4: Verificar cobertura do relatório**

Run: `node tooling/visual-audit/verify.mjs --report docs/visual-route-audit-2026-08-17.md`

Expected: `101 report entries; 101 desktop links; 101 mobile links; 14 TV links`.

- [ ] **Step 5: Commitar o relatório visual**

Run: `git add docs/visual-route-audit-2026-08-17.md && git commit -m "docs(audit): review all product routes"`

### Task 6: Protocolo de 100 componentes e migração

**Files:**

- Modify: `docs/visual-route-audit-2026-08-17.md`

**Interfaces:**

- Consumes: padrões repetidos observados nas 101 rotas.
- Produces: lista numerada 1–100 e fases de migração para `@matriz/design-ui`.

- [ ] **Step 1: Classificar os candidatos**

Agrupar os 100 itens em foundations, ações, formulários, navegação, feedback, dados, overlays, conteúdo, layout e padrões responsivos.

- [ ] **Step 2: Marcar maturidade e consumidores**

Para cada componente, indicar intenção e estágio `existente`, `adaptar`, `consolidar` ou `novo`; apenas recomendar compartilhamento quando houver dois consumidores reais.

- [ ] **Step 3: Definir migração incremental**

Documentar: inventário/aliases, tokens, primitivas sem domínio, adapters app-locais, migração por rota, deprecação e remoção. Proibir domínio, entidades cruas e dependências de app no package.

- [ ] **Step 4: Verificar lista e leis arquiteturais**

Run: `node tooling/visual-audit/verify.mjs --components docs/visual-route-audit-2026-08-17.md`

Expected: `100 unique components; numbering 1..100; 0 app-source imports proposed`.

- [ ] **Step 5: Commitar o protocolo**

Run: `git add docs/visual-route-audit-2026-08-17.md && git commit -m "docs(ui): propose MatrizLib migration protocol"`

### Task 7: Validação e integração final

**Files:**

- Verify: all tracked changes from Tasks 1–6.

**Interfaces:**

- Consumes: commits da auditoria.
- Produces: branch sincronizada e worktree sem artefatos proibidos.

- [ ] **Step 1: Executar checks do relatório e Git**

Run: `node tooling/visual-audit/verify.mjs --all`, `git status --short` e `git ls-files output .next .turbo '*.log' '.env*'`.

Expected: auditoria completa e nenhum artefato proibido rastreado.

- [ ] **Step 2: Executar gates do monorepo se tooling rastreado afetar execução**

Run: `pnpm run build`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:smoke`, `pnpm run prisma:validate`.

Expected: todos terminam com código 0.

- [ ] **Step 3: Atualizar com `origin/main`**

Run: `git fetch origin` e verificar `git merge-base --is-ancestor origin/main HEAD`; fazer merge normal somente se necessário e repetir Steps 1–2 após divergência.

- [ ] **Step 4: Fazer push da branch de trabalho**

Run: `git push -u origin codex/matriz-hub-alpha`.

Expected: upstream aponta para o mesmo SHA local; nenhum push ou merge direto em `main`.

- [ ] **Step 5: Confirmar estado final**

Run: `git status --short --branch`.

Expected: branch sincronizada e worktree limpo.
