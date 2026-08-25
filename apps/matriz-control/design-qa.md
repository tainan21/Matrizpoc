# Matriz Control Design QA

final result: passed

## Evidence

- Source visual truth: user-provided conversation attachment showing the Matriz / Control Apps cockpit, 1919 × 1079 px.
- Implementation screenshot: `implementation-final-1919x1079.png` (local QA artifact; intentionally not committed).
- Route and state: `http://localhost:3008/apps`, dark theme, Contracts selected, global bottom terminal open with no active sessions.
- Viewport: 1919 × 1079 CSS px.
- Source pixels: 1919 × 1079 at the supplied density.
- Implementation pixels: 1919 × 1079, CSS 1919 × 1079, `devicePixelRatio: 1`.
- Density normalization: none required; dimensions match 1:1.
- Browser console: zero warnings and zero errors in the final clean capture.

## Full-view comparison

The implementation preserves the source composition: compact brand strip, seven-item primary navigation, 28% app rail, central app workspace, right agent rail, dark purple palette, selected-app emphasis, compact route/actions rows, and a large terminal-oriented center state. The global terminal extends the reference in the exact region indicated by the user: it rises from the bottom without replacing the dedicated Terminal route.

## Required fidelity surfaces

- **Fonts and typography:** system sans plus monospace operational metadata reproduce the dense tooling hierarchy. Weight, uppercase tracking, and tiny status copy align with the source. The original proprietary/unknown font was not available, so the platform stack is an intentional equivalent.
- **Spacing and layout rhythm:** header heights, three-column proportions, row density, borders, and central empty-state placement match the reference at the same viewport. The open terminal intentionally consumes 320 px at the bottom.
- **Colors and tokens:** near-black surfaces, muted lavender borders, violet selection, green online state, and low-contrast secondary copy match the source language.
- **Image quality and assets:** the reference contains no raster product imagery, illustrations, or photographic assets. No asset substitution was required.
- **Copy and content:** Apps, Workspace, Terminal, Ações, Store, Doctor, Ajustes, route controls, agent presence, and terminal calls-to-action follow the supplied screen and the approved feature design.

Focused region comparison was not required: the target contains no imagery and the typography, controls, borders, and state labels remain legible in the 1:1 full-view evidence.

## Interaction evidence

- Start created a real validated `dev` session and opened the global terminal.
- A second project created a second terminal tab.
- Repeating Start focused the existing active project/action instead of duplicating it.
- Dock moved between bottom and right.
- `Ctrl+J` hid and reopened the dock.
- Stop terminated the process tree and the session retained its exit state.
- Navigation and the dedicated Terminal page use the same persistent provider.
- The Control surface and terminal APIs redirect or reject unauthenticated access; the local token unlock flow was exercised end to end.

## Comparison history

### Iteration 1

- P2: project ports were inferred from list order instead of package metadata.
- Fix: parse validated `dev` script ports, including `-p 3003` and `--port=3008`, and use them for labels and URLs.
- Post-fix evidence: final capture shows Contracts on `:3003` and `http://localhost:3003/`.

### Iteration 2

- P1: Windows could not spawn the Corepack command shim directly, so sessions exited immediately.
- Fix: use the explicit Windows command processor with a fully server-controlled command while retaining `shell:false` and identifier-only browser input.
- Post-fix evidence: browser test started Contracts, captured PID/output, created a second tab, and stopped the process tree.

### Iteration 3

- P2: ANSI control sequences could appear as raw characters in browser output.
- Fix: strip CSI control sequences before adding bounded output lines; regression coverage was added.
- Post-fix evidence: supervisor test verifies clean browser output; the final browser capture has no console warnings or errors.

## Follow-up polish

- P3: replace the small textual terminal mark with the final Matriz icon asset when the official icon set is selected.
- P3: add pointer dragging to the existing keyboard-accessible resize separator.
