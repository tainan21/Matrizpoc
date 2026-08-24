# MatrizLib verification

Verified on 2026-08-18 against the local Next.js development server at
`http://localhost:3007` using Chromium controlled through Playwright CLI.

## Route and viewport evidence

The original seven cases plus the sound catalog were checked at desktop
`1440x1000` and mobile `390x844`:

| Case | Route | Result |
| --- | --- | --- |
| Landing | `/` | 200, H1 `MatrizLib` |
| Catalog | `/components` | 200, H1 `Componentes` |
| Available contract | `/components/stack` | 200, live `Stack` detail |
| Candidate contract | `/components/card` | 200, honest candidate detail |
| Theme laboratory | `/themes` | 200, H1 `Temas` |
| Sound system | `/sounds` | 200, H1 `Sons`, 12 playable semantic entries |
| Architecture guide | `/architecture` | 200, H1 `Arquitetura` |
| Unknown slug | `/components/nao-existe` | expected 404, H1 `404` |

All final captures had document width equal to viewport width. The only element
crossing the mobile content edge on the landing page is an `aria-hidden`
decorative monogram inside an overflow-clipped section; it does not enlarge the
document. The first mobile catalog pass exposed a real regression (`432px`
document width in a `390px` viewport). A narrower responsive display-title
clamp fixed it; the repeated assertion reported `390/390`, a `366px` H1, and
zero overflowing catalog elements.

The sound route repeated the viewport assertion at `1440/1440` and `390/390`.
All 12 cards had measurable content on mobile. Its final evidence is stored in
ignored `output/playwright/matrizlib-sounds-{desktop,mobile}.png`. The sound
list deliberately disables the inherited `content-visibility:auto` optimization
so full-page capture and print do not omit off-viewport technical records.

The 14 final screenshots are in ignored
`output/matrizlib-verification/desktop-*.png` and
`output/matrizlib-verification/mobile-*.png`. They are evidence artifacts, not
repository inputs.

## Interaction and accessibility evidence

- Keyboard: the first `Tab` focuses `Pular para o conteúdo` (`#main-content`).
  Chromium computed a visible solid `2px` focus outline in the action color.
- Catalog live region: entering `Button` in the labelled searchbox reduced the
  list to the canonical Button route and announced `1 componente` through the
  polite `status` region.
- Reduced motion: with `prefers-reduced-motion: reduce`, all 12 reveal regions
  remained visible (`opacity: 1`, `transform: none`) and animation/transition
  durations collapsed to `0.00001s`.
- Portal theme: the header control changed from `Ativar tema escuro` to
  `Ativar tema claro`, set `data-theme="dark"`, updated semantic CSS variables,
  and stored only the color-mode preference.
- Isolated theme laboratory: selecting Aurora, dark, compact, and mobile kept
  the portal shell independent while the specimen reported
  `--matriz-theme-key: aurora` and `Espécime Aurora, modo dark`.
- Sound preview: `Ouvir Notificação` played the real WAV and announced
  `Notificação em reprodução.`. The short cue returned to its idle button after
  completion. Mute disabled every preview; restoring audio re-enabled them.
- Sound preferences: changing global volume to 35% and muting wrote only the
  versioned `matriz:sound-preferences:v1` payload with enabled, muted, volume,
  and `matriz-default` pack ID. No physical filename entered consumer state.
- Sound catalog search: `pedido` produced one `order` result and the live region
  announced `1 som`. The main navigation remained Componentes, Temas, Sons at
  mobile width.
- Console: all successful routes produced no warning or error. The unknown
  route produced only Chromium's expected failed-document 404 entry, with no
  JavaScript exception or React error.

## Reproduction

```bash
pnpm --filter @matriz/app-matrizlib dev
```

Use Playwright CLI with one persistent Chromium session, resize to each viewport,
navigate through the route table, assert `documentElement.scrollWidth ===
documentElement.clientWidth`, and take full-page screenshots. Then repeat the
keyboard, search live-region, reduced-motion, portal-theme, and isolated-theme
checks above.

Run the deterministic application gates separately:

```bash
pnpm --filter @matriz/app-matrizlib test
pnpm --filter @matriz/app-matrizlib lint
pnpm --filter @matriz/app-matrizlib typecheck
pnpm --filter @matriz/app-matrizlib build
```

`apps/matrizlib/next-env.d.ts` is the official generated Next.js declaration
and belongs in version control. `.next/`, Playwright session state, traces, and
`output/` are generated caches/evidence and must remain untracked.
