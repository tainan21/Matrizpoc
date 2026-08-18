# MatrizLib Sound System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, typed, replaceable sound system to the shared Matriz design contract and expose Sounds as the third primary pillar of the MatrizLib portal.

**Architecture:** Extend `@matriz/design-ui` with a pure-TypeScript `./sounds` public subpath containing semantic metadata, pack registry, preferences, and an injected audio driver. Keep all catalog presentation, filters, preview state, and route composition inside `apps/matrizlib`; the portal consumes the public package API and never owns physical sound IDs or browser audio primitives.

**Tech Stack:** TypeScript 5.6 strict mode, React 19, Next.js 16 App Router, Vitest 2, Testing Library, native HTML audio, deterministic PCM WAV generation, existing Matriz semantic CSS.

**Spec:** `docs/superpowers/specs/2026-08-18-matrizlib-sound-system-design.md`

## Global Constraints

- Preserve the portal's dark, dense, technical-inventory visual identity.
- Ship exactly these canonical semantic IDs: `system.start`, `system.end`, `notification`, `message`, `order`, `success`, `error`, `warning`, `interaction`, `navigation`, `open`, and `close`.
- Every canonical ID must have real audible WAV content and complete catalog metadata in `matriz-default`.
- Product code must never create `Audio`, `HTMLAudioElement`, or reference physical filenames; only the internal browser driver may do so.
- Sound remains optional feedback: playback failure must not break product behavior or block shutdown/logout.
- Respect autoplay policy, global enable, mute, volume, and persisted preferences without browser-policy workarounds.
- Do not add a heavy audio dependency, new database, new settings service, Next.js coupling, unfinished portal routes, or MCP server.
- Do not import `apps/**` from packages or another app's internals from MatrizLib.
- Keep TypeScript strict, WCAG 2.2 AA interaction semantics, 44px targets, responsive layouts, and existing consumer compatibility.
- Use TDD for every behavioral task and commit only the files owned by that task.

---

### Task 1: Canonical sound contract, registry, and real default assets

**Files:**
- Create: `packages/design/ui/scripts/generate-default-sounds.mjs`
- Create: `packages/design/ui/assets/sounds/matriz-default/*.wav`
- Create: `packages/design/ui/src/sounds/types.ts`
- Create: `packages/design/ui/src/sounds/catalog.ts`
- Create: `packages/design/ui/src/sounds/default-pack.ts`
- Create: `packages/design/ui/src/sounds/assets.generated.ts`
- Create: `packages/design/ui/src/sounds/registry.ts`
- Test: `packages/design/ui/src/sounds/registry.test.ts`
- Modify: `packages/design/ui/vitest.config.ts`

**Interfaces:**
- Consumes: no sound interfaces; this task establishes the authority.
- Produces:

```ts
export const SOUND_IDS: readonly SoundId[]
export type SoundId =
  | "system.start" | "system.end"
  | "notification" | "message" | "order"
  | "success" | "error" | "warning"
  | "interaction" | "navigation" | "open" | "close"

export type SoundCategory = "system" | "communication" | "commerce" | "status" | "interaction"
export type SoundStatus = "available" | "disabled"

export interface SoundDefinition {
  readonly id: SoundId
  readonly name: string
  readonly description: string
  readonly category: SoundCategory
  readonly status: SoundStatus
  readonly assetKey: string
  readonly defaultVolume: number
  readonly defaultEnabled: boolean
  readonly accessibility: string
}

export interface SoundAsset {
  readonly source: string
  readonly mimeType: "audio/wav"
  readonly durationMs: number
}

export interface SoundPack {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly assets: Readonly<Record<SoundId, SoundAsset>>
}

export interface SoundRegistry {
  listSounds(): readonly SoundDefinition[]
  getSound(id: SoundId): SoundDefinition
  listPacks(): readonly SoundPack[]
  getPack(id: string): SoundPack | undefined
  registerPack(pack: SoundPack): void
}

export const soundCatalog: readonly SoundDefinition[]
export const matrizDefaultSoundPack: SoundPack
export const soundRegistry: SoundRegistry
export function createSoundRegistry(initialPacks?: readonly SoundPack[]): SoundRegistry
```

- [ ] **Step 1: Write failing registry and pack completeness tests**

Assert the exact 12 IDs, unique definitions, values within `0..1`, non-empty accessibility copy, audible `data:audio/wav;base64,` sources, positive durations, immutable list snapshots, complete pack validation, duplicate pack rejection, and successful registration of a complete custom pack.

```ts
expect(SOUND_IDS).toEqual([
  "system.start", "system.end", "notification", "message", "order",
  "success", "error", "warning", "interaction", "navigation", "open", "close",
])
expect(Object.keys(matrizDefaultSoundPack.assets).sort()).toEqual([...SOUND_IDS].sort())
expect(() => registry.registerPack(incompletePack)).toThrow(/missing sound/i)
```

- [ ] **Step 2: Run the focused test and witness RED**

Run: `pnpm --filter @matriz/design-ui test -- src/sounds/registry.test.ts`

Expected: FAIL because `./registry`, `SOUND_IDS`, and the default pack do not exist.

- [ ] **Step 3: Generate the 12 deterministic WAV assets**

Implement `generate-default-sounds.mjs` with Node built-ins only. Generate mono 16-bit PCM WAV at 16 kHz, 120–320 ms, with distinct restrained envelopes/frequency sequences per semantic ID. Write physical WAV files under `assets/sounds/matriz-default/` and a deterministic `assets.generated.ts` whose data URIs and duration metadata are consumed by `default-pack.ts`.

The script must have a fixed configuration map keyed by all 12 IDs and fail if an ID lacks a recipe. Run:

```powershell
node packages/design/ui/scripts/generate-default-sounds.mjs
```

- [ ] **Step 4: Implement the typed catalog and registry**

Implement frozen catalog entries and a registry backed by `Map<string, SoundPack>`. `registerPack` must verify every `SOUND_IDS` key, reject unknown/missing keys and duplicate IDs, and store a frozen defensive copy. `listSounds()` and `listPacks()` return frozen snapshots rather than internal mutable collections.

- [ ] **Step 5: Make Vitest include pure TypeScript sound tests and run GREEN**

Change the include pattern to cover `src/**/*.test.ts` in addition to TSX. Run:

```powershell
pnpm --filter @matriz/design-ui test -- src/sounds/registry.test.ts
pnpm --filter @matriz/design-ui typecheck
```

Expected: registry tests and typecheck exit 0.

- [ ] **Step 6: Audit asset output and commit**

Run:

```powershell
Get-ChildItem packages/design/ui/assets/sounds/matriz-default/*.wav | Measure-Object
git diff --check
```

Expected: exactly 12 non-empty WAV files and no whitespace errors.

```powershell
git add packages/design/ui
git commit -m "feat(design-ui): define canonical sound registry"
```

---

### Task 2: Sound runtime, preferences, autoplay, and pack switching

**Files:**
- Create: `packages/design/ui/src/sounds/driver.ts`
- Create: `packages/design/ui/src/sounds/preferences.ts`
- Create: `packages/design/ui/src/sounds/system.ts`
- Create: `packages/design/ui/src/sounds/index.ts`
- Test: `packages/design/ui/src/sounds/preferences.test.ts`
- Test: `packages/design/ui/src/sounds/system.test.ts`

**Interfaces:**
- Consumes: `SoundId`, `SoundPack`, `SoundRegistry`, and `soundRegistry` from Task 1.
- Produces:

```ts
export interface SoundPreferences {
  readonly enabled: boolean
  readonly muted: boolean
  readonly volume: number
  readonly packId: string
}

export interface SoundPreferenceStore {
  read(): SoundPreferences | undefined
  write(value: SoundPreferences): void
}

export interface SoundAudioDriver {
  play(source: string, volume: number, onEnded: () => void): Promise<void>
  stop(): void
}

export type SoundPlayResult =
  | { readonly status: "played"; readonly id: SoundId }
  | { readonly status: "queued"; readonly id: SoundId }
  | { readonly status: "skipped"; readonly id: SoundId; readonly reason: "disabled" | "muted" | "unsupported" | "unavailable" }

export interface SoundSystemState extends SoundPreferences {
  readonly initialized: boolean
  readonly playingId?: SoundId
}

export interface SoundSystem {
  initialize(options?: { readonly startup?: boolean }): Promise<SoundPlayResult | undefined>
  play(id: SoundId): Promise<SoundPlayResult>
  stop(): void
  enable(): void
  disable(): void
  mute(): void
  unmute(): void
  setVolume(value: number): void
  getVolume(): number
  isEnabled(): boolean
  isMuted(): boolean
  setPack(packId: string): void
  getPack(): string
  getState(): SoundSystemState
  subscribe(listener: (state: SoundSystemState) => void): () => void
}

export function createSoundSystem(dependencies?: {
  readonly registry?: SoundRegistry
  readonly driver?: SoundAudioDriver
  readonly preferences?: SoundPreferenceStore
  readonly activationTarget?: Pick<Document, "addEventListener" | "removeEventListener">
}): SoundSystem

export const sound: SoundSystem
```

- [ ] **Step 1: Write failing preference tests**

Test defaults, one versioned local-storage key, malformed JSON fallback, missing pack fallback, volume clamping, and immutable returned state. Use a memory storage fake; never touch real browser storage in unit tests.

- [ ] **Step 2: Run preference tests and witness RED**

Run: `pnpm --filter @matriz/design-ui test -- src/sounds/preferences.test.ts`

Expected: FAIL because the preference adapter does not exist.

- [ ] **Step 3: Implement preference adapters**

Implement `createBrowserSoundPreferenceStore()` and `createMemorySoundPreferenceStore()` behind `SoundPreferenceStore`. Use the single key `matriz:sound-preferences:v1`. Validate decoded fields and fall back to:

```ts
{ enabled: true, muted: false, volume: 0.7, packId: "matriz-default" }
```

- [ ] **Step 4: Write failing runtime tests**

Use a fake driver and fake activation target. Cover initialization hydration, global controls, subscriber updates, per-sound volume multiplication, stop-before-next-play, disabled/muted skips, pack switching, missing pack rejection, unsupported SSR, `system.end` non-blocking behavior, and autoplay rejection.

For startup autoplay, make the fake driver's first `play` reject with a `NotAllowedError`; assert `initialize({ startup: true })` returns queued, exactly one `pointerdown` and one `keydown` listener are installed, the first legitimate event retries once, and both listeners are removed.

- [ ] **Step 5: Run runtime tests and witness RED**

Run: `pnpm --filter @matriz/design-ui test -- src/sounds/system.test.ts`

Expected: FAIL because `createSoundSystem` and drivers do not exist.

- [ ] **Step 6: Implement the driver and runtime**

Keep the only `new Audio(...)` call inside `createBrowserSoundAudioDriver`. Set `preload = "auto"`; stop/reset the current element before a new play; set effective volume to `clamp(globalVolume * definition.defaultVolume, 0, 1)`; resolve normal playback without throwing failures into product callbacks.

The singleton chooses the browser driver only when browser globals exist. `initialize({ startup: false })` hydrates without playback. On a startup autoplay rejection, queue only `system.start`, install one-shot activation listeners, and clean them after either activation path.

- [ ] **Step 7: Run package tests, typecheck, lint, and commit**

```powershell
pnpm --filter @matriz/design-ui test
pnpm --filter @matriz/design-ui typecheck
pnpm --filter @matriz/design-ui lint
git diff --check
git add packages/design/ui/src/sounds
git commit -m "feat(design-ui): add shared sound runtime"
```

Expected: every command exits 0.

---

### Task 3: Public sound surface and optional integration contracts

**Files:**
- Modify: `packages/design/ui/package.json`
- Modify: `packages/design/ui/README.md`
- Modify: `packages/design/ui/AGENTS.md`
- Create: `packages/design/ui/src/sounds/integrations.ts`
- Test: `packages/design/ui/src/sounds/integrations.test.ts`
- Modify: `tests/smoke/public-contracts.test.ts`

**Interfaces:**
- Consumes: public `SoundId`, `SoundSystem`, and singleton `sound` from Task 2.
- Produces:

```ts
export interface SoundFeedbackOptions {
  readonly soundSystem?: SoundSystem
}

export function playNavigationFeedback(options?: SoundFeedbackOptions): Promise<SoundPlayResult>
export function playInteractionFeedback(
  id?: Extract<SoundId, "interaction" | "open" | "close">,
  options?: SoundFeedbackOptions,
): Promise<SoundPlayResult>
```

- [ ] **Step 1: Write failing integration and public-contract tests**

Assert navigation delegates to `navigation`; interaction defaults to
`interaction` and accepts only `open`/`close`; the package declares
`./sounds`; and importing `@matriz/design-ui/sounds` exposes the registry,
factory, singleton, and helpers without importing Next.js.

- [ ] **Step 2: Run focused tests and witness RED**

```powershell
pnpm --filter @matriz/design-ui test -- src/sounds/integrations.test.ts
pnpm exec vitest run tests/smoke/public-contracts.test.ts --config vitest.config.ts
```

Expected: FAIL because the helpers and package subpath do not exist.

- [ ] **Step 3: Implement the framework-neutral helpers and export map**

Add `"./sounds": "./src/sounds/index.ts"` to package exports. Helpers must
delegate to the injected/default `SoundSystem` and contain no routing import,
event interception, or component-specific behavior.

- [ ] **Step 4: Document ownership and consumer guidance**

Update the package README/AGENTS to state that browser audio primitives are
internal, sound is opt-in, physical assets are pack-owned, and consumers use
only `@matriz/design-ui/sounds`.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm --filter @matriz/design-ui test
pnpm --filter @matriz/design-ui typecheck
pnpm exec vitest run tests/smoke/public-contracts.test.ts --config vitest.config.ts
git diff --check
git add packages/design/ui tests/smoke/public-contracts.test.ts
git commit -m "feat(design-ui): expose sound integration contract"
```

---

### Task 4: Make Components, Themes, and Sounds equal portal pillars

**Files:**
- Modify: `apps/matrizlib/src/ui/site-header.tsx`
- Modify: `apps/matrizlib/src/ui/site-header.test.tsx`
- Modify: `apps/matrizlib/app/page.tsx`
- Modify: `apps/matrizlib/app/page.test.tsx`
- Modify: `apps/matrizlib/src/manifest/manifest.ts`
- Modify: `apps/matrizlib/src/manifest/manifest.test.ts`
- Modify: `apps/matrizlib/src/bootstrap/index.ts`
- Modify: `apps/matrizlib/app/layout.tsx`
- Modify: `apps/matrizlib/app/globals.css`

**Interfaces:**
- Consumes: the `/sounds` route contract to be implemented in Task 5.
- Produces: manifest route `/sounds`, capability `matrizlib.sounds.read`, primary navigation metadata, and a visually explicit three-pillar shell.

- [ ] **Step 1: Write failing manifest and shell tests**

Assert the manifest contains `/sounds` at the same navigation tier as
`/components` and `/themes`, exposes `matrizlib.sounds.read`, and mentions
components/themes/sounds in description/onboarding. Assert the header exposes
exactly the three primary links in a `Navegação principal` region and
Architecture in a separate `Navegação técnica` region. Assert the landing has
three pillar cards linking to their real routes and no links to unfinished
areas.

- [ ] **Step 2: Run tests and witness RED**

```powershell
pnpm --filter @matriz/app-matrizlib test -- src/manifest/manifest.test.ts src/ui/site-header.test.tsx app/page.test.tsx
```

Expected: FAIL because Sounds is absent.

- [ ] **Step 3: Implement navigation, manifest, copy, and landing hierarchy**

Keep `Componentes`, `Temas`, and `Sons` in a primary data array. Render
`Arquitetura` separately and style it with lower visual weight. Update portal
metadata/bootstrap copy from “componentes, temas e arquitetura” to the shared
language framing. Preserve the existing brand, top navigation, dark canvas,
dividers, uppercase labels, and purple accent.

- [ ] **Step 4: Add responsive CSS without hiding either navigation region**

Primary destinations retain 44px targets and wrap on narrow screens. Technical
navigation may move to its own row but cannot disappear. Verify no horizontal
overflow at 390px.

- [ ] **Step 5: Run scoped tests, lint, typecheck, and commit**

```powershell
pnpm --filter @matriz/app-matrizlib test
pnpm --filter @matriz/app-matrizlib lint
pnpm --filter @matriz/app-matrizlib typecheck
git diff --check
git add apps/matrizlib
git commit -m "feat(matrizlib): establish three product-language pillars"
```

---

### Task 5: Build the `/sounds` catalog, filters, controls, and preview

**Files:**
- Create: `apps/matrizlib/app/sounds/page.tsx`
- Create: `apps/matrizlib/app/sounds/page.test.tsx`
- Create: `apps/matrizlib/src/sounds/types.ts`
- Create: `apps/matrizlib/src/sounds/query.ts`
- Create: `apps/matrizlib/src/sounds/query.test.ts`
- Create: `apps/matrizlib/src/sounds/presenters.ts`
- Create: `apps/matrizlib/src/sounds/presenters.test.ts`
- Create: `apps/matrizlib/src/ui/sounds/sound-explorer.tsx`
- Create: `apps/matrizlib/src/ui/sounds/sound-explorer.test.tsx`
- Modify: `apps/matrizlib/app/globals.css`

**Interfaces:**
- Consumes: `soundCatalog`, `soundRegistry`, `sound`, `SoundDefinition`, `SoundId`, `SoundCategory`, `SoundStatus`, and `SoundSystem` from `@matriz/design-ui/sounds`.
- Produces:

```ts
export interface SoundCatalogFilters {
  readonly query: string
  readonly category: SoundCategory | "all"
  readonly status: SoundStatus | "all"
  readonly packId: string | "all"
}

export interface SoundCatalogItemViewModel {
  readonly id: SoundId
  readonly name: string
  readonly description: string
  readonly category: SoundCategory
  readonly categoryLabel: string
  readonly status: SoundStatus
  readonly statusLabel: string
  readonly accessibility: string
}

export function filterSounds(
  entries: readonly SoundDefinition[],
  filters: SoundCatalogFilters,
): readonly SoundDefinition[]

export function toSoundCatalogPageViewModel(
  entries: readonly SoundDefinition[],
  packs: readonly SoundPack[],
): {
  readonly summary: { total: number; available: number; categories: number; packs: number }
  readonly items: readonly SoundCatalogItemViewModel[]
}
```

- [ ] **Step 1: Write failing query and presenter tests**

Cover accent/case-insensitive search across ID/name/description, category,
status, pack filters, combined filters, stable input order, four metrics, and
Portuguese category/status labels.

- [ ] **Step 2: Run data tests and witness RED**

Run: `pnpm --filter @matriz/app-matrizlib test -- src/sounds/query.test.ts src/sounds/presenters.test.ts`

Expected: FAIL because sound portal models do not exist.

- [ ] **Step 3: Implement query and presenter functions**

Keep package definitions out of JSX by converting them to portal view models.
Do not duplicate canonical IDs, descriptions, categories, volumes, pack data,
or availability in the app.

- [ ] **Step 4: Write failing page and explorer tests**

Assert masthead `SONS`, Total/Disponíveis/Categorias/Pack metrics, labeled
search/category/status/pack controls, 12 initial cards, empty state, live result
count, enable/mute/volume controls, and one active preview.

Use an injected fake `SoundSystem`. Assert Play calls the semantic ID; active
button becomes Stop; starting another preview stops the first; Stop invokes
`stop`; volume uses `setVolume`; disable/mute state is textual and visual; and
driver skips are announced without breaking UI.

- [ ] **Step 5: Run UI tests and witness RED**

Run: `pnpm --filter @matriz/app-matrizlib test -- app/sounds/page.test.tsx src/ui/sounds/sound-explorer.test.tsx`

Expected: FAIL because the route and explorer do not exist.

- [ ] **Step 6: Implement the server route and client explorer**

The server page reads serializable catalog/pack metadata and passes it to the
client explorer. The client explorer defaults its internal runtime to the
public singleton, subscribes once, cleans up on unmount, and uses event
handlers rather than effects for playback. Render native buttons/selects/range
input with accessible names, visible text state, `role="status"`, and one active
sound.

- [ ] **Step 7: Style the dense responsive catalog**

Reuse catalog masthead, summary, control, stage badge, list rhythm, borders,
and semantic variables. Add only sound-specific equalizer/playing indicators,
global control rail, and preview action layout. Under reduced motion, the
indicator remains visible without animation. At 390px, controls and cards stack
without document overflow.

- [ ] **Step 8: Run scoped gates and commit**

```powershell
pnpm --filter @matriz/app-matrizlib test
pnpm --filter @matriz/app-matrizlib lint
pnpm --filter @matriz/app-matrizlib typecheck
pnpm --filter @matriz/app-matrizlib build
git diff --check
git add apps/matrizlib
git commit -m "feat(matrizlib): add shared sound catalog"
```

Expected: all commands exit 0 and Next lists `/sounds`.

---

### Task 6: Documentation, browser verification, consumers, and final integration

**Files:**
- Modify: `apps/matrizlib/README.md`
- Modify: `apps/matrizlib/docs/AGENT-START-HERE.md`
- Modify: `apps/matrizlib/docs/VERIFICATION.md`
- Modify: `docs/matrizlib/README.md`
- Modify: `docs/matrizlib/MIGRATION.md`
- Modify: `docs/matrizlib/ECOSYSTEM-MEMORY-2026-08-17.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `docs/app-ownership-map.md`
- Test: `tests/smoke/app-boundaries.test.ts`
- Test: `tests/smoke/matrizlib-adoption.test.ts`

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: durable ownership/migration guidance, visual evidence, consumer compatibility evidence, and synchronized branch state.

- [ ] **Step 1: Update durable documentation**

Document the UI/Visual/Interaction/Documentation conceptual map, `./sounds`
ownership, canonical ID semantics, preference behavior, custom-pack example,
opt-in navigation/component guidance, asset-generation command, `/sounds`
route, MCP metadata-only boundary, and replacement workflow. Explicitly state
that consumers must not call browser audio APIs or physical file paths.

- [ ] **Step 2: Extend smoke coverage**

Add assertions that the new public subpath is resolvable, package code contains
no app/Next routing imports, all 12 IDs have assets, and MatrizLib advertises
the `/sounds` route/capability without changing its manifest-only public
contract.

- [ ] **Step 3: Run the portal and perform browser verification**

Run: `pnpm --filter @matriz/app-matrizlib dev`

Using Playwright CLI, verify `/`, `/components`, `/themes`, `/sounds`, and
`/architecture` at `1440x1000` and `390x844`. For `/sounds`, verify search,
each filter, enable/disable, mute/unmute, volume, play/stop, switching sounds,
keyboard focus, live announcements, reduced motion, no overflow, and no console
errors. Confirm a real audible asset starts after explicit Play; do not attempt
to bypass autoplay.

Store ignored captures under `output/matrizlib-sounds-verification/` and append
reproduction evidence to `apps/matrizlib/docs/VERIFICATION.md`.

- [ ] **Step 4: Run scoped package and portal gates**

```powershell
pnpm --filter @matriz/design-ui test
pnpm --filter @matriz/design-ui lint
pnpm --filter @matriz/design-ui typecheck
pnpm --filter @matriz/design-ui build-storybook
pnpm --filter @matriz/app-matrizlib test
pnpm --filter @matriz/app-matrizlib lint
pnpm --filter @matriz/app-matrizlib typecheck
pnpm --filter @matriz/app-matrizlib build
```

Expected: every command exits 0.

- [ ] **Step 5: Run complete monorepo gates**

```powershell
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test:smoke
pnpm run prisma:validate
```

Expected: every command exits 0; all existing product apps compile with the
expanded package export.

- [ ] **Step 6: Audit tracked files and commit documentation**

```powershell
git diff --check
git status --short
git ls-files | rg "(^|/)(\.env|\.next|\.turbo|node_modules|output|.*\.log)(/|$)"
```

Expected: no whitespace errors or tracked secrets, caches, logs, screenshots,
or browser traces. The intentional 12 WAV files under
`packages/design/ui/assets/sounds/matriz-default/` are allowed source assets.

```powershell
git add apps/matrizlib/docs apps/matrizlib/README.md docs tests/smoke
git commit -m "docs(matrizlib): document shared sound language"
```

- [ ] **Step 7: Request final code review and resolve findings**

Review the complete diff from `c62b1c7` through the documentation commit
against the spec and this plan. Fix every Critical/Important finding with a
focused RED/GREEN test cycle, re-run affected gates, and request one scoped
re-review. Record deferred Minor findings only when they are explicitly
non-blocking.

- [ ] **Step 8: Integrate origin/main and push the approved branch**

```powershell
git fetch origin
git merge-base --is-ancestor origin/main HEAD
```

If `origin/main` is already an ancestor, do not create an empty merge. If it is
not, merge `origin/main` normally, preserve local changes, resolve conflicts,
and repeat all complete gates. Then:

```powershell
git push -u origin codex/matriz-hub-alpha
git status --short --branch
git rev-parse HEAD
git rev-parse origin/codex/matriz-hub-alpha
```

Expected: clean synchronized worktree and matching local/remote SHA; never push
or merge directly into `main`.
