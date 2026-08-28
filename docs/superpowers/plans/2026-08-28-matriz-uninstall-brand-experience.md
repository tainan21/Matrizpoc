# Matriz Uninstall Brand Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Matriz Control-aligned identity, full-window operational UI, branded Windows packages and Control Store entry for Matriz Uninstall.

**Architecture:** Keep all Uninstall product UI and identity app-local. Extend existing presenters with UI-only grouping while retaining the native gateways. Register Store availability through existing public manifest/catalog contracts; never import another app's internals.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Tauri 2/Rust, Electron/electron-builder, NSIS, SVG/ICO/PNG.

**Spec:** `docs/superpowers/specs/2026-08-28-matriz-uninstall-brand-experience-design.md`

## Global Constraints

- Tauri is the primary edition and Electron is compatibility-only.
- Preserve installation safety and existing gateway behavior.
- UI consumes ViewModels, never raw domain entities.
- Do not introduce cross-app internal imports.
- Stable releases require signed manifests and Authenticode.

---

### Task 1: Brand system and deterministic assets

**Files:**
- Create: `apps/matriz-uninstall/assets/brand/*.svg`
- Create: `apps/matriz-uninstall/assets/brand/README.md`
- Create: `apps/matriz-uninstall/scripts/generate-brand-assets.ps1`
- Modify: Tauri and Electron package configuration

- [ ] Create the symbol and lockups as accessible, compact SVG.
- [ ] Add a repeatable conversion script for PNG/ICO and installer artwork.
- [ ] Generate assets and verify every configured path exists.
- [ ] Commit the identity independently.

### Task 2: ViewModels and navigation behavior

**Files:**
- Modify: `apps/matriz-uninstall/src/application/product-presenter.ts`
- Modify: `apps/matriz-uninstall/src/domain/types.ts`
- Test: `apps/matriz-uninstall/src/application/product-presenter.test.ts`

- [ ] Write failing tests for counts and Products/Updates/Cleanup grouping.
- [ ] Add presentation-only summaries and filtering types.
- [ ] Run app tests and commit the behavior.

### Task 3: Full-window Control-aligned interface

**Files:**
- Modify: `apps/matriz-uninstall/src/ui/app.tsx`
- Modify: `apps/matriz-uninstall/src/ui/styles.css`
- Test: `apps/matriz-uninstall/src/ui/app.test.tsx`

- [ ] Add tests for tabs, selection, inspector, theme and action access.
- [ ] Implement the product bar, tabs, rail, workspace, inspector and status strip.
- [ ] Implement dark, light and high-contrast token sets plus reduced motion.
- [ ] Verify responsive layouts and commit the renderer.

### Task 4: Complete operational copy and dialogs

**Files:**
- Create: `apps/matriz-uninstall/src/ui/product-copy.ts`
- Modify: `apps/matriz-uninstall/src/ui/app.tsx`
- Test: `apps/matriz-uninstall/src/ui/product-copy.test.ts`

- [ ] Define exact copy for every lifecycle/status outcome.
- [ ] Replace browser confirmations with accessible product dialogs.
- [ ] Verify cancellation and destructive actions remain explicit.
- [ ] Commit copy and dialogs.

### Task 5: Matriz Control Store registration

**Files:**
- Modify existing Store presenter/catalog adapter files under `apps/matriz-control`
- Test corresponding Store tests

- [ ] Write a failing test that expects Tauri recommended and Electron compatibility entries.
- [ ] Map the existing distribution catalog/manifest into Store ViewModels.
- [ ] Render unavailable products without inventing installer paths.
- [ ] Run Control tests and commit Store integration.

### Task 6: Visual review, packages and delivery

**Files:**
- Modify package metadata/workflow only where validation finds drift.
- Update: `docs/benchmarks/matriz-uninstall-tauri-electron.md`

- [ ] Open the Superdesign canvas and collect brand/UI references.
- [ ] Run visual inspection of the real renderer at desktop and narrow widths.
- [ ] Run app tests, lint, typecheck, Rust tests, smoke and boundaries.
- [ ] Build both NSIS installers and copy final artifacts with SHA-256 hashes.
- [ ] Review diff, commit, push, create PR, wait for gates and merge without deleting branches.
