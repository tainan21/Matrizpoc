# Application Runtime Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar e conectar um inventário vivo dos runtimes dos 16 apps, mantendo fatos, hipóteses e decisões arquiteturais claramente separados.

**Architecture:** `docs/application-runtime-inventory.md` será a única matriz viva de runtime. A política estável continuará em `docs/desktop-application-architecture.md`, enquanto `docs/releases/v1/installer-inventory.md` permanecerá um snapshot histórico; somente links curtos conectarão essas responsabilidades.

**Tech Stack:** Markdown, PowerShell, ripgrep e Git.

**Spec:** `docs/superpowers/specs/2026-08-28-application-runtime-inventory-design.md`

## Global Constraints

- O incremento é exclusivamente documental.
- Não alterar manifests, packages, scripts, tooling, CI, instaladores ou código de aplicação.
- Tauri é o padrão; Electron permanece provisório sem exceção registrada e evidência reproduzível.
- Apps sem requisito desktop permanecem web/serviço; a política não cria um shell automaticamente.
- Fatos devem apontar para paths versionados; outputs, `.next` e `node_modules` não são evidência.
- Não editar `docs/architectural-laws.md` nem reescrever snapshots históricos neste incremento.
- Não decidir consolidação entre `matriz-control` e `matriz-desktop`.
- Não publicar a branch remota neste incremento.

---

### Task 1: Criar o inventário canônico dos 16 apps

**Files:**
- Create: `docs/application-runtime-inventory.md`
- Reference: `docs/desktop-application-architecture.md`
- Reference: `docs/monorepo-structure.md`
- Reference: `docs/releases/v1/installer-inventory.md`

**Interfaces:**
- Consumes: diretórios `apps/<app>`, `apps/<app>/package.json`, configurações Tauri e entradas/configurações Electron versionadas.
- Produces: uma tabela Markdown com exatamente uma linha por app e as colunas `App`, `Papel`, `Superfície atual`, `Stack comprovada`, `Classificação`, `Alvo atual`, `Risco`, `Prioridade`, `Evidência` e `Próximo checkpoint`.

- [ ] **Step 1: Confirmar a lista canônica de apps antes de escrever**

Run:

```powershell
$apps = Get-ChildItem -LiteralPath apps -Directory |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'package.json') } |
  Sort-Object Name |
  Select-Object -ExpandProperty Name
$apps
if ($apps.Count -ne 16) { throw "Expected 16 apps, found $($apps.Count)" }
```

Expected: exatamente `contracts`, `health`, `matriz-admin`, `matriz-control`, `matriz-desktop`, `matriz-hub`, `matriz-identity`, `matriz-ops`, `matriz-pay`, `matriz-uninstall`, `matriz-workbench`, `matrizlib`, `seumeiapp`, `sites`, `spot` e `willdash`.

- [ ] **Step 2: Confirmar que a nova fonte ainda não existe**

Run:

```powershell
if (Test-Path -LiteralPath 'docs/application-runtime-inventory.md') {
  throw 'Inventory already exists; inspect it before proceeding'
}
```

Expected: exit 0 sem output.

- [ ] **Step 3: Criar o cabeçalho, a legenda e a matriz completa**

Create `docs/application-runtime-inventory.md` with these sections and table rows:

```markdown
# Inventário de runtimes das aplicações

> Fonte viva do estado e da classificação de runtime dos apps Matriz. A política
> de escolha está em `docs/desktop-application-architecture.md`; o inventário de
> instaladores V1 é um snapshot histórico e não substitui esta matriz.

## Como interpretar

- **Comprovado** descreve arquivos e dependências versionados.
- **Classificação** aplica a política vigente sem transformar hipótese em decisão.
- **Alvo atual** é a menor direção segura conhecida; não autoriza migração.
- Prioridade **P1** pede investigação antes de ampliar o runtime, **P2** pede
  manutenção controlada e **P3** não exige trabalho desktop agora.

## Matriz

| App | Papel | Superfície atual | Stack comprovada | Classificação | Alvo atual | Risco | Prioridade | Evidência | Próximo checkpoint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `contracts` | Contratos e histórico | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhum shell desktop | P3 | `apps/contracts/package.json` | Reavaliar somente com requisito desktop aprovado |
| `health` | Saúde e telemetria local | Web/serviço | Next.js | web/serviço | Permanecer web/serviço | Baixo: nenhuma configuração desktop | P3 | `apps/health/package.json` | Reavaliar somente com requisito desktop aprovado |
| `matriz-admin` | Administração operacional | Web + desktop | Tauri 2 | Tauri confirmado | Manter Tauri | Baixo: runtime alinhado | P2 | `apps/matriz-admin/package.json`; `apps/matriz-admin/desktop/src-tauri/tauri.conf.json` | Validar pacote e rollback quando o app for alterado |
| `matriz-control` | Supervisão local, terminal e Project Host | Web + desktop | Electron | Electron provisório | Investigar sobreposição e requisitos privilegiados antes de decidir | Alto: overlap com `matriz-desktop` e superfície nativa ampla | P1 | `apps/matriz-control/package.json`; `apps/matriz-control/desktop/main.ts` | Comparar responsabilidades, WebView2, terminal, browser e updater |
| `matriz-desktop` | Cockpit nativo Windows | Desktop | Tauri 2 | Tauri confirmado | Manter como referência Tauri do Control | Médio: nome de produto coincide com `matriz-control` | P1 | `apps/matriz-desktop/package.json`; `apps/matriz-desktop/src-tauri/tauri.conf.json` | Delimitar ownership frente ao Control Electron |
| `matriz-hub` | Control plane e MatrizDocs | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/matriz-hub/package.json` | Reavaliar somente com requisito desktop aprovado |
| `matriz-identity` | OIDC e identidade central | Serviço | Node/TypeScript | web/serviço | Permanecer serviço | Baixo: desktop não pertence ao papel do app | P3 | `apps/matriz-identity/package.json` | Manter runtime de serviço separado de shells locais |
| `matriz-ops` | Operações | Web + desktop | Tauri 2 | Tauri confirmado | Manter Tauri | Baixo: runtime alinhado | P2 | `apps/matriz-ops/package.json`; `apps/matriz-ops/desktop/src-tauri/tauri.conf.json` | Validar pacote e rollback quando o app for alterado |
| `matriz-pay` | Pagamentos e ledger | Serviço | Node/TypeScript | web/serviço | Permanecer serviço | Baixo: nenhuma configuração desktop | P3 | `apps/matriz-pay/package.json` | Reavaliar somente com requisito desktop aprovado |
| `matriz-uninstall` | Manutenção e desinstalação confiável | Web + dois desktops | Tauri 2 + Electron | Tauri principal; Electron compatibilidade | Preservar comparação até critério de saída explícito | Médio: duas stacks mantêm responsabilidade semelhante | P1 | `apps/matriz-uninstall/package.json`; `apps/matriz-uninstall/desktop/tauri/src-tauri/tauri.conf.json`; `apps/matriz-uninstall/desktop/electron/main.ts` | Definir paridade, benchmark, rollback e data de revisão do Electron |
| `matriz-workbench` | Tooling local-first e agentes | Web + desktop | Electron | Electron provisório | Investigar possível exceção | Alto: Node local, updater e operações de agentes podem justificar exceção | P1 | `apps/matriz-workbench/package.json`; `apps/matriz-workbench/electron-builder.config.cjs`; `apps/matriz-workbench/src/native-desktop/main.ts` | Inventariar dependências obrigatórias de Chromium/Node e alternativas Tauri |
| `matrizlib` | Catálogo visual e design system | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/matrizlib/package.json` | Reavaliar somente com requisito desktop aprovado |
| `seumeiapp` | Produto Seumei | Web + desktop | Electron | Electron provisório | Avaliar migração incremental para Tauri | Alto: produto desktop ativo e política atual divergente | P1 | `apps/seumeiapp/package.json`; `apps/seumeiapp/desktop/main.ts`; `apps/seumeiapp/desktop/electron-builder.yml` | Mapear persistência, offline, updater, assinatura e rollback antes de migrar |
| `sites` | Sites e configuração file-backed | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/sites/package.json` | Reavaliar somente com requisito desktop aprovado |
| `spot` | Bandas, artistas, gigs e bookings | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/spot/package.json` | Reavaliar somente com requisito desktop aprovado |
| `willdash` | Metas, recompensas e atividade | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/willdash/package.json` | Reavaliar somente com requisito desktop aprovado |
```

- [ ] **Step 4: Adicionar as seções de drift e manutenção**

Append this content:

```markdown
## Drift conhecido

- `docs/architecture-overview.md` ainda descreve sete apps e métricas antigas.
- `docs/architectural-laws.md` contém trechos históricos que ainda dizem que
  `matriz-identity` não existe.
- documentos anteriores alternam `seumei`, `apps/seumei` e `seumeiapp`; o
  diretório atual é `apps/seumeiapp` e a identidade pública permanece `seumei`.
- `matriz-control` e `matriz-desktop` usam o nome de produto Matriz Control e
  precisam de uma decisão de ownership separada.
- `docs/releases/v1/installer-inventory.md` registra uma baseline de release em
  2026-08-27; ele não representa automaticamente o estado atual.

Esses pontos devem ser corrigidos em increments independentes, preservando
trechos históricos quando forem deliberadamente datados.

## Regra de atualização

Atualize esta matriz no mesmo commit que adicionar, remover ou trocar um runtime
desktop. Uma mudança para Electron exige também o registro de exceção definido
em `docs/desktop-application-architecture.md`. Mudanças apenas de versão que não
alterem a classificação atualizam a evidência somente quando ela deixar de ser
válida.
```

- [ ] **Step 5: Verificar cobertura, unicidade e evidências**

Run:

```powershell
$inventory = Get-Content -LiteralPath 'docs/application-runtime-inventory.md' -Raw
$apps = Get-ChildItem -LiteralPath apps -Directory |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'package.json') } |
  Sort-Object Name |
  Select-Object -ExpandProperty Name
foreach ($app in $apps) {
  $count = ([regex]::Matches($inventory, "(?m)^\| ``$([regex]::Escape($app))`` \|")).Count
  if ($count -ne 1) { throw "$app appears $count times" }
}
$rows = ([regex]::Matches($inventory, '(?m)^\| `[^`]+` \|')).Count
if ($rows -ne 16) { throw "Expected 16 app rows, found $rows" }
```

Expected: exit 0 sem output.

- [ ] **Step 6: Revisar e commitar o inventário isoladamente**

Run:

```powershell
git diff -- docs/application-runtime-inventory.md
git diff --check
git add -- docs/application-runtime-inventory.md
git diff --cached --check
git commit -m "docs: inventory application desktop runtimes"
```

Expected: um commit contendo somente `docs/application-runtime-inventory.md`.

---

### Task 2: Conectar política, estrutura e inventário sem duplicar conteúdo

**Files:**
- Modify: `docs/desktop-application-architecture.md:7-18`
- Modify: `docs/monorepo-structure.md:6-12`
- Reference: `docs/application-runtime-inventory.md`

**Interfaces:**
- Consumes: o inventário criado na Task 1.
- Produces: dois links canônicos e explicações curtas de responsabilidade; nenhum segundo inventário.

- [ ] **Step 1: Demonstrar que os links ainda estão ausentes**

Run:

```powershell
$matches = rg -n 'application-runtime-inventory\.md' docs/desktop-application-architecture.md docs/monorepo-structure.md
if ($LASTEXITCODE -eq 0) { throw 'Inventory links already exist; inspect before editing' }
if ($LASTEXITCODE -ne 1) { throw 'Link scan failed' }
```

Expected: exit 0 do wrapper, sem matches do `rg`.

- [ ] **Step 2: Ligar a política ao estado vivo**

After the introductory paragraph in `docs/desktop-application-architecture.md`, add:

```markdown

O estado comprovado e a classificação de cada app ficam em
`docs/application-runtime-inventory.md`. Este documento define a regra; o
inventário registra onde cada aplicação está sem transformar implementação
existente em exceção automática.
```

- [ ] **Step 3: Ligar o mapa do monorepo ao inventário**

After the introductory paragraph in `docs/monorepo-structure.md`, add:

```markdown

Stacks e classificações desktop mudam em ritmo diferente do ownership. Consulte
`docs/application-runtime-inventory.md` para o estado vivo de runtime e
`docs/desktop-application-architecture.md` para a política Tauri-first.
```

- [ ] **Step 4: Confirmar que há exatamente dois links novos**

Run:

```powershell
$matches = rg -n 'application-runtime-inventory\.md' docs/desktop-application-architecture.md docs/monorepo-structure.md
if ($LASTEXITCODE -ne 0) { throw 'Inventory links missing' }
if (($matches | Measure-Object).Count -ne 2) { throw 'Expected one link per canonical document' }
$matches
```

Expected: uma ocorrência em cada documento.

- [ ] **Step 5: Revisar e commitar apenas os links**

Run:

```powershell
git diff -- docs/desktop-application-architecture.md docs/monorepo-structure.md
git diff --check
git add -- docs/desktop-application-architecture.md docs/monorepo-structure.md
git diff --cached --check
git commit -m "docs: link canonical runtime inventory"
```

Expected: um commit pequeno contendo somente os dois documentos canônicos.

---

### Task 3: Executar auditoria final da entrega documental

**Files:**
- Verify: `docs/application-runtime-inventory.md`
- Verify: `docs/desktop-application-architecture.md`
- Verify: `docs/monorepo-structure.md`
- Verify: `docs/superpowers/specs/2026-08-28-application-runtime-inventory-design.md`

**Interfaces:**
- Consumes: os documentos e commits das Tasks 1 e 2.
- Produces: evidência de cobertura, coerência, limites arquiteturais e árvore limpa pronta para revisão.

- [ ] **Step 1: Validar todos os paths de evidência escritos entre crases na matriz**

Run:

```powershell
$inventory = Get-Content -LiteralPath 'docs/application-runtime-inventory.md' -Raw
$paths = [regex]::Matches($inventory, '`(apps/[^`]+)`') |
  ForEach-Object { $_.Groups[1].Value } |
  Sort-Object -Unique
foreach ($path in $paths) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing evidence path: $path" }
}
Write-Output "validated_paths=$($paths.Count)"
```

Expected: exit 0 e contagem positiva de paths versionados.

- [ ] **Step 2: Procurar contradições diretas e linguagem de exceção definitiva**

Run:

```powershell
rg -n -i 'Electron (é|como) padrão|Electron por padrão|Electron confirmado|Electron justificado' docs/application-runtime-inventory.md
if ($LASTEXITCODE -eq 0) { throw 'Contradictory or definitive Electron language found' }
if ($LASTEXITCODE -ne 1) { throw 'Contradiction scan failed' }
rg -n 'Electron provisório|Tauri confirmado|web/serviço' docs/application-runtime-inventory.md
if ($LASTEXITCODE -ne 0) { throw 'Expected classifications missing' }
```

Expected: nenhuma contradição e matches para as classificações permitidas.

- [ ] **Step 3: Executar os gates globais da árvore reconciliada**

Run:

```powershell
& 'C:\Program Files\nodejs\corepack.cmd' pnpm test:smoke
& 'C:\Program Files\nodejs\corepack.cmd' pnpm verify:boundaries
```

Expected: 51 arquivos/372 smoke tests aprovados e todos os apps aprovados no boundary check.

- [ ] **Step 4: Confirmar o diff final e a árvore limpa**

Run:

```powershell
git diff --check main...HEAD
git status --short --branch
git log --oneline --decorate main..HEAD
```

Expected: nenhum erro de whitespace, nenhuma alteração não commitada e commits identificáveis para merge de `origin/main`, especificação, inventário e links.

- [ ] **Step 5: Entregar para revisão sem publicar**

Report:

```text
Branch: codex/application-runtime-inventory
Created: docs/application-runtime-inventory.md
Linked from: docs/desktop-application-architecture.md, docs/monorepo-structure.md
Validation: coverage, evidence paths, contradiction scan, diff check, smoke, boundaries
Remote publication: not performed
```

Expected: o usuário escolhe integração local, publicação ou preservação da branch; nenhuma dessas ações é inferida pelo executor.
