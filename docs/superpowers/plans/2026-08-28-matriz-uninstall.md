# Matriz Uninstall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` and `superpowers:test-driven-development`.

**Goal:** Entregar as edições Tauri e Electron do Matriz Uninstall, apoiadas por
catálogo persistente no Hub e administração no Matriz Admin.

**Architecture:** Um app compartilha domínio, renderer e contratos de gateway;
dois shells implementam autoridade Windows. O Hub possui o catálogo e o Admin o
opera exclusivamente por HTTP versionado.

**Tech Stack:** TypeScript, React, Vite, Vitest, Next.js, Prisma, Tauri 2/Rust,
Electron 44 e NSIS.

**Spec:** `docs/superpowers/specs/2026-08-28-matriz-uninstall-design.md`

## Restrições globais

- Windows 10/11 x64; instalação por usuário atual.
- Nenhum import de internals entre apps.
- Dados do usuário preservados por padrão.
- Nenhuma branch, worktree ou instalação histórica removida automaticamente.
- Código comportamental nasce por teste vermelho, implementação mínima e
  refatoração verde.

## Entregas

- [ ] Contratos v1 e modelos/migration/repository do catálogo no Hub.
- [ ] Endpoints públicos e administrativos com autorização e idempotência.
- [ ] Superfície Distribuição no Admin por gateway HTTP.
- [ ] Núcleo, renderer, journal e limpeza segura do Matriz Uninstall.
- [ ] Adapter Tauri e instalador `com.matriz.uninstall.tauri`.
- [ ] Adapter Electron e instalador `com.matriz.uninstall.electron`.
- [ ] Catálogo inicial, cache offline e auto-desinstalação.
- [ ] Aceitação Windows, benchmark, workflow e artefatos.
- [ ] Gates finais, revisão, PR e merge sem force em `main`.

