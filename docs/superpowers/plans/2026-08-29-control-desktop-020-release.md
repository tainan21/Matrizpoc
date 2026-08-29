# Matriz Control Desktop 0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar uma edição Windows 0.2.0 do Matriz Control que inicia no cockpit completo e possui um caminho de release seguro e verificável.

**Architecture:** O Next standalone já empacotado permanece a única UI para web e desktop. O processo Electron troca somente a rota inicial de `/browser` para `/home`; capacidades nativas continuam expostas pelo bridge existente. Um workflow manual da tag valida o mesmo pacote e só publica depois de assinatura/autenticação configuradas.

**Tech Stack:** Next.js 16, Electron 44, electron-builder/NSIS, GitHub Actions, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-control-desktop-020-design.md`

## Global Constraints

- Windows x64 e NSIS por usuário são o alvo desta entrega.
- `apps/matriz-control` continua dono do shell, bridge, updater e distribuição.
- Sem URL, token, certificado, publisher, comando, path ou artefato vindo do renderer.
- Ausência de assinatura ou provider confiável falha fechada; não publicar release incompleta.
- Não adicionar package compartilhado, dependência de produção ou acesso a internals de outro app.

---

### Task 1: Tornar o cockpit completo a entrada desktop

**Files:**
- Modify: `apps/matriz-control/desktop/launch.mjs`
- Modify: `apps/matriz-control/desktop/main.ts`
- Create: `apps/matriz-control/desktop/startup-route.test.ts`

**Interfaces:**
- Produces: a constante de rota desktop `"/home"`, usada pelo launcher e pelo pacote.
- Consumes: o servidor Next loopback existente em `127.0.0.1:3009`.

- [x] Escrever teste que verifica a rota de entrada do launcher e do processo principal.
- [x] Executar o teste e confirmar a falha contra a entrada legada `/browser`.
- [x] Trocar a rota inicial por `/home`, preservando `/browser` como rota interna navegável.
- [x] Rodar o teste focado e a suíte do Control.

### Task 2: Declarar release assinada e validada

**Files:**
- Modify: `apps/matriz-control/package.json`
- Create: `.github/workflows/matriz-control-windows-release.yml`
- Create: `.github/workflows/matriz-control-windows-release.test.ts` only if existing workflow test convention allows it; otherwise validate by structural shell assertions in the workflow job.

**Interfaces:**
- Produces: workflow `control-windows-release` acionado por tag `control-v*` e `workflow_dispatch`.
- Consumes: versão do package, variáveis/secrets de assinatura e GitHub Release.

- [x] Escrever a verificação estrutural do workflow ou um teste equivalente de sua configuração.
- [x] Configurar o `electron-builder` para provider GitHub somente durante CI confiável; jamais com URL de renderer.
- [x] Criar workflow com gates de teste/lint/typecheck/build/desktop build, checagem tag-versão e checagem de secrets.
- [x] Gerar checksum SHA-256 e publicar somente `exe`, `blockmap`, `yml` e checksum após os gates.
- [x] Rodar a verificação focada.

### Task 3: Documentar operação e validar pacote

**Files:**
- Modify: `apps/matriz-control/README.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `apps/matriz-control/docs/ENVIRONMENT-CONTROL-GUIDE.md` if release variables are catalogued there.

**Interfaces:**
- Produces: instrução precisa para gerar instalador local e publicar release assinada, sem registrar segredos.

- [x] Atualizar documentação com rota inicial e pré-requisitos do CI.
- [x] Rodar `pnpm --filter @matriz/app-matriz-control lint`, `typecheck`, `test`, `build`, `desktop:compile`.
- [x] Rodar `pnpm test:smoke`, `pnpm verify:boundaries`, `pnpm verify:tracked-artifacts` e `git diff --check`.
- [x] Inspecionar artefatos de `desktop:build` sem adicionar saídas geradas ao Git.
- [ ] Commitar e integrar somente com todos os gates verdes.
