# Matriz Control — Windows acceptance

The release contract validates the installed product, not only source code.

## Local release gate

1. Run `corepack pnpm --filter @matriz/app-matriz-desktop test`, `typecheck`, and `lint`.
2. Run Rust format, tests, and Clippy with warnings denied.
3. Run `corepack pnpm --filter @matriz/app-matriz-desktop package` once.
4. Run the Playwright WebView2 gate with `corepack pnpm --filter @matriz/app-matriz-desktop e2e`.
5. Run `acceptance:installed` twice with distinct `MATRIZ_ACCEPTANCE_RUN_ID` values.
6. Confirm both lifecycle records say `pass` and `uninstalled: true`, with the same installer SHA-256.
7. Generate the canonical Markdown report with `node apps/matriz-desktop/acceptance/generate-report.mjs`.

Evidence is written below `output/matriz-control-acceptance/` and remains
ignored. The tracked report contains no machine-specific user path.

## Coverage

- nine catalog apps, including external-port ownership protection;
- six bounded PowerShell/ConPTY tabs, Unicode, Ctrl+C, streaming, and cleanup;
- installed-product exit, settings persistence, Doctor, Git pulse, and command deck;
- Matriz Admin native build, verified install, start, and stop;
- Playwright connects directly to the owned WebView2 process over an ephemeral CDP port; no registry change or EdgeDriver is used;
- 42 screenshots per cycle, covering all 14 primary areas at compact, standard, and wide sizes;
- accessible names, keyboard focus, overflow, reduced motion, idle CPU/RAM, and startup upper bound;
- installer verification, install, product execution, and uninstall.

## Safety

The harness only accepts the official per-user install directory or an isolated
acceptance root. It never kills unrelated listeners. If a catalog port is
already occupied, the journey asserts the `EXTERNO` protected state and leaves
that process untouched. Acceptance markers must never appear in the production
executable.

CI repeats the same procedure daily and on manual dispatch through
`.github/workflows/matriz-desktop-acceptance.yml`.
