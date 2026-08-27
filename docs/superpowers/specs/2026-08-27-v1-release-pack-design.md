# Matriz V1 Release Pack Design

**Date:** 2026-08-27  
**Status:** Approved direction; implementation pending specification review  
**Target branch:** `main`  
**Publication policy:** Local artifacts only; no GitHub Release and no remote push

## Purpose

Create a complete, verifiable release package for the consolidated Matriz V1. The package must explain what was incorporated, distinguish consolidation from indiscriminate branch merging, present the system visually, and provide locally generated Windows installers with integrity information and operating instructions.

## Current baseline

The local `main` and `master` branches point to commit `041f6bab5b5498a75761f9d8efa9569a25a266b3`. The consolidation consists of exactly eight commits based on the previous `main` baseline `61398bcbde4ebafe8f5c975c858038721faa399d`.

Historical branches were not all merged. Valuable source, documentation, configuration, tests, migrations, and product work were selected and reconstructed into the eight consolidation commits. Checkpoint branches, worktrees, and four stashes remain preserved.

## Deliverables

### 1. Release documentation

Create a canonical Markdown report under `docs/releases/v1/` containing:

- executive summary;
- consolidation timeline and the eight commits;
- incorporated applications and platform capabilities;
- branches and checkpoints preserved but not merged;
- architecture and runtime-port map;
- installation prerequisites;
- installer usage and verification instructions;
- validation evidence, known warnings, and residual risks;
- rollback and recovery guidance;
- location and SHA-256 of each generated artifact.

Create a polished DOCX edition of the same report with a cover, table of contents, diagrams, screenshots, captions, headers, footers, and page numbers. Render the DOCX to page images and visually inspect every page before delivery.

### 2. Visual presentation

Create a concise presentation-oriented document or deck covering:

- `main -> master -> gates -> main V1` consolidation flow;
- the eight consolidation waves;
- ecosystem map of the applications;
- screenshots of representative product surfaces;
- installer matrix;
- validation results and remaining operational risks.

All screenshots must come from the consolidated local source. Placeholder product images are prohibited. Sensitive values, `.env` contents, tokens, filesystem secrets, and personal information must not appear.

### 3. Screenshots

Start only the minimum applications needed for representative evidence. Prefer screenshots of:

- Matriz Hub ecosystem or registry;
- Matriz Control home or applications surface;
- Matriz Workbench project/work surface;
- Seumei workspace;
- MatrizLib catalog;
- Health dashboard;
- Matriz Ops overview.

If a surface requires unavailable external infrastructure or credentials, document it as unavailable rather than fabricating a screenshot. Store approved images under `docs/releases/v1/screenshots/` with descriptive names.

### 4. Windows installers

Generate installers only for applications that already contain a supported packaging configuration. Candidate targets are:

- Matriz Control;
- Matriz Desktop;
- Seumei Desktop;
- Matriz Admin Desktop;
- Matriz Ops Desktop.

Do not invent a packaging system for an application that lacks one. For every candidate, inspect its package scripts, desktop configuration, icons, signing expectations, output directory, and CI workflow before building.

Generated binaries must not be committed to Git unless an existing repository policy explicitly requires it. Copy final local deliverables into a dedicated ignored release-output directory, then create a committed textual manifest containing filename, application, version, format, size, SHA-256, build command, and validation result.

Unsigned installers must be clearly labeled as local development artifacts. Missing signing certificates must not be bypassed or replaced with fabricated credentials.

## Implementation approach

### Phase 1: inventory

Inspect package manifests, Tauri/Electron configuration, workflow files, ignore rules, and existing release scripts. Produce a target matrix before running expensive builds.

### Phase 2: installer builds

Build one installer target at a time to avoid resource contention. Preserve logs outside Git. After each build:

1. confirm the expected artifact exists;
2. confirm it has a non-zero size;
3. calculate SHA-256;
4. inspect embedded version or installer metadata when tooling permits;
5. record success, warning, or failure without hiding unavailable prerequisites.

### Phase 3: visual evidence

Run applications with safe local/demo configuration. Capture screenshots through browser automation where possible. Use operating-system capture only for native desktop surfaces that cannot be captured through a browser. Stop only the processes started for this release work.

### Phase 4: documentation

Assemble the Markdown source first, then produce the DOCX and presentation from verified data and screenshots. Keep technical identifiers exact. The document must explicitly state that branch consolidation was selective.

### Phase 5: verification and handoff

Run scoped tests for any source adjustment, validate documentation links and artifact hashes, render and inspect the DOCX/deck, scan Git changes for secrets and generated build output, and confirm the `main` worktree status.

## Git strategy

Documentation source, screenshots, and textual manifests may be committed to `main` after verification. Large generated installers, caches, `.next`, `dist`, `node_modules`, Storybook output, logs, and temporary render files remain outside Git.

No historical branch deletion, worktree removal, stash deletion, remote push, GitHub Release creation, or history rewrite is part of this work.

## Success criteria

- The report clearly answers whether all branches were merged.
- Every claimed installer has a locally verified file and SHA-256.
- Every screenshot is traceable to the consolidated V1.
- The DOCX and visual presentation pass render inspection.
- No secret or generated cache is committed.
- `main` contains the verified documentation commit and remains the canonical local V1.
- Failures caused by unavailable signing, credentials, databases, or platform dependencies are reported explicitly as `INDEFINIDO` or blocked, never presented as success.

## Risks and controls

- **Installer signing:** local artifacts may be unsigned. Label them and do not weaken security controls.
- **Large builds:** build sequentially and retain reproducible commands and logs.
- **Environment-dependent screens:** use only safe demo/local configuration and redact sensitive data.
- **Generated-file pollution:** inspect the Git index before committing.
- **Branch misconception:** distinguish selected incorporation from branch ancestry in every executive summary.
- **Operational drift:** compute hashes only after final artifacts are in their delivery location.

