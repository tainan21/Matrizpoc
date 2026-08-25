# Matriz Control — Browser design system

## Product and job

Matriz Control is a local-only operational cockpit for known Matriz projects. `/browser` adds a Windows desktop Chromium workspace for developers and agents while keeping the existing web shell, terminal dock, loopback unlock, and strict no-arbitrary-shell boundary. The page must make capsule/account isolation, vault state, agent authority, and active resource use understandable at a glance.

## Page architecture

- Preserve the existing 46px brand bar and 60px module navigation.
- Add `NAVEGADOR` as an equal primary route; do not redesign other modules.
- Browser workspace: 248–280px capsule rail on the left, flexible central browser stage, 300–340px collapsible context rail on the right.
- Central stage: compact capsule-colored tab strip, navigation toolbar, then a large native-content mount region. The native region must read as live content rather than a decorative mock browser screenshot.
- Right rail tabs: Biblioteca, Leitura, Arquivos, Dev, Agente. Default to Biblioteca and allow collapse.
- The global terminal dock remains available on bottom/right and must not be obscured.
- Normal web mode without the Electron bridge replaces the content mount with a precise desktop-runtime diagnostic and launch guidance.

## Core states and actions

- Capsules show human/agent type, isolated status, active tab count, cache size, vault lock state, and policy preset.
- Default starter capsules: Pessoal (human), Testes (agent-safe), Automação (agent-full but visibly armed only after explicit configuration).
- Address field accepts URLs or searches; provider indicator defaults to DuckDuckGo and can show Google/custom per capsule.
- Toolbar: back, forward, reload/stop, address/search, bookmark, reader, screenshot, downloads, DevTools, more.
- Status must cover loading, audio, WebGL/GPU, suspended tab, agent connected, offline, permission request, download, and vault warning.
- Library supports favorites, history, notes, saved tabs, downloads, screenshots/PDF/text snapshots and safe merge.
- File editor opens as an internal tab with project/path breadcrumb, dirty/conflict state, search, save, and close.
- Agent panel shows delegated capsule, `human`/`agent-safe`/`agent-full`, active lease, last action, audit summary, and kill switch.
- WebGL lab is a local diagnostic surface with animated test viewport, WebGL2 result, renderer/GPU, FPS, audio test, and permissions.

## Visual language

- Use ONLY the tokens already defined by `apps/matriz-control/app/globals.css`.
- Background `#08060e`; panels `#0d0915`/`#130c20`; lines `#2a1c3d`; primary text `#f4effb`.
- Accent remains `#9a55ff` with restrained dark-purple selection gradients. Status green is `#51e2a8`; danger is `#ed6b7a`; warning is `#efb563`.
- Inter/system UI typography; operational metadata uses compact uppercase monospace with wide tracking.
- Dense, calm developer-tool aesthetic. Avoid marketing layouts, oversized hero text, glassmorphism, neon gradients, illustrations, emoji, fake 3D chrome, and new colors.
- Controls use 5–9px radii and visible 1px borders. Hierarchy comes from spacing, border groups, and restrained accent states.
- Preserve strong focus visibility, keyboard navigation, non-color status labels, minimum target sizes, and reduced-motion support.

## Responsive behavior

- Desktop Electron is the primary target at 1440×900 and must remain usable at 1100×720.
- Below 1100px collapse the right context rail into a drawer.
- Below 820px collapse the capsule rail into a switcher; keep toolbar and current content usable.
- Never put browser content behind the terminal dock; the native viewport bounds react to dock size and placement.

## Motion and sound

- Motion is functional only: 120–180ms panel/tab transitions, loading progress, clear suspend/resume state. Disable under reduced motion.
- Semantic Matriz sound cues are opt-in for open, close, navigation, success, warning, and error. Sound never replaces text or visual feedback.

## Security communication

- Remote content never visually blends with privileged Control UI: preserve a clear toolbar/frame boundary and show origin.
- `agent-full` uses a persistent danger-marked state; safe mode and human capsules remain visually distinct.
- Never display secrets, cookies, typed values, BitLocker keys, arbitrary paths, or raw IPC/MCP data.
- Destructive or unsupported operations explain the boundary and the recovery action without alarming generic error copy.
