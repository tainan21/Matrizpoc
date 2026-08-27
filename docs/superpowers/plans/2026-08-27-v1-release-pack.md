# Matriz V1 Release Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified local Matriz V1 release package with supported Windows installers, real screenshots, complete documentation, and integrity manifests.

**Architecture:** Treat build products, visual evidence, and documentation as separate stages joined by a textual release manifest. Generated binaries and caches remain outside Git; verified documentation sources, selected screenshots, and the manifest are committed to `main`.

**Tech Stack:** pnpm 9, Turborepo, Next.js 16, Electron Builder, Tauri 2, Playwright CLI, DOCX/OOXML tooling, PowerShell, Git.

**Spec:** `docs/superpowers/specs/2026-08-27-v1-release-pack-design.md`

## Global Constraints

- Generate and validate artifacts locally; do not publish a GitHub Release or push remotely.
- Do not delete historical branches, checkpoint branches, worktrees, or stashes.
- Do not commit installers, `.next`, `dist`, `node_modules`, Storybook output, logs, or temporary renders.
- Do not expose `.env` values, tokens, secrets, personal data, or signing material.
- Label unsigned installers as local development artifacts.
- Report unavailable prerequisites as `INDEFINIDO` or blocked.

---

### Task 1: Installer inventory

**Files:**
- Create: `docs/releases/v1/installer-inventory.md`
- Inspect: `apps/*/package.json`
- Inspect: `apps/*/desktop/**`
- Inspect: `.github/workflows/*release*.yml`

**Interfaces:**
- Produces: a target matrix with app, packaging technology, command, output path, signing requirement, and build status.

- [ ] Inspect the five candidate applications and their release workflows.
- [ ] Record only commands already supported by repository configuration.
- [ ] Create the ignored local output directory `output/releases/v1/installers/`.
- [ ] Verify `git check-ignore` covers generated output.
- [ ] Commit the inventory with `docs(v1): inventory local installer targets`.

### Task 2: Local installer builds

**Files:**
- Create outside Git: `output/releases/v1/installers/**`
- Create outside Git: `output/releases/v1/logs/**`
- Create: `docs/releases/v1/installer-manifest.json`
- Create: `docs/releases/v1/INSTALLERS.md`

**Interfaces:**
- Consumes: commands and paths from `installer-inventory.md`.
- Produces: `installer-manifest.json` entries with `app`, `version`, `format`, `fileName`, `sizeBytes`, `sha256`, `command`, `signed`, and `status`.

- [ ] Build each supported target sequentially.
- [ ] Preserve complete command output in ignored log files.
- [ ] Copy successful final artifacts to the release output directory.
- [ ] Calculate SHA-256 and file size after copying.
- [ ] Record failures without fabricating an artifact or bypassing signing controls.
- [ ] Validate the JSON manifest parses and every successful entry matches a real file and hash.
- [ ] Commit textual installer documentation and manifest with `docs(v1): document local installers`.

### Task 3: Representative application screenshots

**Files:**
- Create: `docs/releases/v1/screenshots/*.png`
- Create outside Git: `output/releases/v1/logs/dev-*.log`

**Interfaces:**
- Produces: named PNG evidence referenced by the report and presentation.

- [ ] Verify Playwright CLI prerequisites.
- [ ] Start one application at a time using its declared local port and safe demo configuration.
- [ ] Capture Hub, Control, Workbench, Seumei, MatrizLib, Health, and Ops where locally renderable.
- [ ] Inspect every PNG for load errors, secrets, personal information, cropping, and readability.
- [ ] Stop only processes started by this task.
- [ ] Record unavailable surfaces in the report rather than using placeholders.

### Task 4: Canonical Markdown report

**Files:**
- Create: `docs/releases/v1/README.md`
- Create: `docs/releases/v1/branch-consolidation.md`
- Create: `docs/releases/v1/architecture.md`
- Create: `docs/releases/v1/validation.md`

**Interfaces:**
- Consumes: Git history, installer manifest, validation logs, and screenshots.
- Produces: canonical textual content for DOCX and presentation.

- [ ] Document the selective consolidation model and list the eight original V1 commits.
- [ ] Document the later release-documentation commits separately from the eight consolidation commits.
- [ ] Add Mermaid diagrams for consolidation flow, ecosystem boundaries, and runtime ports.
- [ ] Add installer instructions, integrity verification, rollback guidance, known warnings, and risks.
- [ ] Verify every relative link and screenshot path exists.

### Task 5: Polished DOCX report

**Files:**
- Create: `docs/releases/v1/Matriz-V1-Release-Pack.docx`
- Create outside Git: `output/releases/v1/rendered-report/**`

**Interfaces:**
- Consumes: canonical Markdown report and approved screenshots.
- Produces: a visually verified DOCX report.

- [ ] Initialize the document artifact operation using the bundled workspace runtime.
- [ ] Create the DOCX with cover, contents, headings, tables, captions, screenshots, headers, footers, and page numbers.
- [ ] Render the DOCX to PNG pages and PDF for inspection.
- [ ] Inspect every rendered page and correct clipping, overflow, spacing, and unreadable images.
- [ ] Run an accessibility check for headings, table headers, links, and image descriptions.

### Task 6: Visual presentation

**Files:**
- Create: `docs/releases/v1/Matriz-V1-Apresentacao.pptx`
- Create outside Git: `output/releases/v1/rendered-presentation/**`

**Interfaces:**
- Consumes: consolidation timeline, ecosystem map, installer matrix, validation evidence, and screenshots.
- Produces: a concise presentation deck suitable for stakeholder review.

- [ ] Create slides for the objective, selective-consolidation model, eight waves, ecosystem, screenshots, installers, gates, and next steps.
- [ ] Render every slide to images.
- [ ] Inspect typography, contrast, cropping, alignment, and data consistency.
- [ ] Correct all visible defects and rerender.

### Task 7: Final verification and main handoff

**Files:**
- Modify: `docs/releases/v1/validation.md`

**Interfaces:**
- Consumes: all completed release artifacts.
- Produces: a clean, evidence-backed `main` documentation state.

- [ ] Recalculate every installer hash and compare it with the manifest.
- [ ] Scan tracked changes for secrets and prohibited generated directories.
- [ ] Run Markdown link checks and parse all JSON manifests.
- [ ] Verify DOCX and PPTX final renders exist and match the latest files.
- [ ] Confirm screenshots contain no error overlays or sensitive content.
- [ ] Commit verified release documentation with `docs(v1): publish local release pack`.
- [ ] Confirm `main` points to the final documentation commit and report that no remote push occurred.

