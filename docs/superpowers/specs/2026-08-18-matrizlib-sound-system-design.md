# MatrizLib Sound System Design

**Date:** 2026-08-18

**Status:** approved in conversation; pending written-spec review

## Purpose

Evolve MatrizLib from a component reference into the shared product language
for the Matriz ecosystem. The portal must present three equal primary pillars:
Components, Themes, and Sounds. This increment introduces a real, centralized,
opt-in sound system without changing the portal's dark, dense, technical
inventory identity.

## Scope

This increment delivers:

- a typed, public sound API owned by the existing shared design package;
- a canonical registry with 12 semantic sound events;
- a real default sound pack whose assets are easy to replace;
- global enable, mute, volume, and active-pack controls;
- browser-autoplay-aware initialization;
- optional integration contracts for navigation and components;
- a complete `/sounds` catalog and preview experience;
- primary navigation that gives Components, Themes, and Sounds equal weight;
- metadata and contracts suitable for future MCP exposure, without an MCP
  server.

It does not automatically add sounds to product applications or every UI
component, implement multiple polished packs, create unfinished pages for
Tokens/Icons/Patterns, or rewrite the existing MatrizLib portal.

## Ownership and boundaries

### Shared runtime

The sound runtime belongs in `packages/design/ui` and is exported through the
new public subpath `@matriz/design-ui/sounds`. This is the smallest stable
extension of the already shared Matriz UI contract. It avoids a premature
package while keeping application code from calling browser audio APIs.

The sound module is domain-free and must not import applications, routing,
integration, flow, access, authentication, HTTP, or product-domain code. It is
implemented as pure TypeScript and does not require React.

### Portal

`apps/matrizlib` owns the `/sounds` route, catalog composition, filters,
preview UI, explanatory copy, and portal navigation. It consumes only the
public sound export. Portal code does not become the sound authority.

### Assets

The initial `matriz-default` pack contains 12 short, real WAV assets in a
dedicated package asset directory. Each semantic ID maps to a physical asset
through the pack registry. Consumers never import or name physical files.
Replacing an asset or selecting a different pack does not change
`sound.play(id)` calls.

## Public model

### Sound IDs

The canonical typed IDs are:

```text
system.start
system.end
notification
message
order
success
error
warning
interaction
navigation
open
close
```

Arbitrary string IDs are not accepted by the default public API.

### Sound definition

Each registry entry contains:

- `id`;
- human name;
- description;
- semantic category;
- availability status;
- default volume;
- default-enabled flag;
- pack-relative asset key;
- catalog metadata and accessibility guidance.

The semantic definition and the physical asset mapping are separate. A sound
pack maps every canonical ID to an asset descriptor. Registration rejects an
incomplete pack so every selected pack remains safe for every typed call.

### Packs

The pack contract supports:

- the built-in `matriz-default` pack;
- registration and selection of replacement packs;
- future `matriz-soft`, `matriz-minimal`, and custom packs;
- stable semantic calls independent of physical file names.

Only `matriz-default` is shipped in this increment. Its assets are real,
audible, short, and intentionally restrained so they serve as usable defaults
and clear replacement references.

## Runtime API

The public singleton is exposed as `sound` with an accompanying factory for
tests and advanced isolation. The supported surface is conceptually:

```ts
sound.initialize()
sound.play("notification")
sound.stop()
sound.enable()
sound.disable()
sound.mute()
sound.unmute()
sound.setVolume(0.7)
sound.getVolume()
sound.isEnabled()
sound.isMuted()
sound.setPack("matriz-default")
sound.getPack()
```

`play` returns a small result describing whether playback started, was queued
for user activation, or was skipped because sound is disabled, muted, missing,
or unsupported. Audio feedback is never a functional dependency and playback
failure does not throw through ordinary UI interaction.

`system.end` is fire-and-forget. Consumers must not delay logout, navigation,
window close, or shutdown while audio completes.

## Browser and platform behavior

The runtime depends on an internal audio-driver interface. The browser driver
is the only place that creates or refers to `HTMLAudioElement`. Tests inject a
fake driver; SSR and unsupported environments use a safe inert driver.

`initialize()` prepares runtime state. If browser autoplay prevents playback,
the runtime records the pending startup cue and installs a one-shot listener
for a legitimate first pointer or keyboard interaction. It then attempts the
pending cue and removes the listener. It does not synthesize interaction,
repeatedly retry, hide media, or otherwise bypass browser policy.

Native and desktop implementations can supply a different driver later
without changing the semantic API.

## Preferences

Sound preferences use one versioned persistence record containing enabled,
muted, volume, and active pack. The initial browser adapter follows the same
small local-storage pattern already used by MatrizLib's theme control, while
keeping persistence behind an injectable interface. It does not introduce a
second application-wide settings service or import `platform/storage` into the
design package, which its ownership rules prohibit.

Invalid or unavailable persisted values fall back to safe defaults. Volume is
clamped from 0 to 1. Disabling sound and muting sound are distinct: disable is
the feature preference; mute is a reversible session/user control.

## Optional integration

### Navigation

The package exposes a small framework-neutral navigation feedback helper. A
consumer may call it after a confirmed route change. It has no Next.js import,
router subscription, or automatic global interception.

### Components

This increment provides an opt-in sound-trigger contract/helper suitable for
Button, IconButton, Dialog, Toast, Notification, Menu, Dropdown, Tabs, and
navigation compositions. It does not change every component API and does not
play sounds automatically. A later promotion may add a `sound` prop to a
specific stable component after real consumers demonstrate the need.

## Portal experience

### Navigation hierarchy

Components, Themes, and Sounds are styled as the three primary destinations.
Architecture remains a secondary technical destination. No links are added for
unimplemented Tokens, Icons, Patterns, Motion, or MCP pages.

### `/sounds`

The route mirrors the established component catalog language:

- masthead `SONS` with a concise shared-language explanation;
- metrics for total, available, categories, and active pack;
- search, category, status, and pack filters;
- dense cards containing ID, name, category, description, status, and preview;
- global enable, mute, and volume controls;
- one active preview at a time with play/stop state;
- responsive layouts without horizontal overflow.

The preview UI remains a technical audition tool rather than a media player.
Controls use native buttons and range input, visible focus, accessible names,
44px targets, status text, and an `aria-live` announcement. Visual state never
depends on sound alone.

## Accessibility

- Sound starts only from explicit preview action, except an application that
  deliberately requests `system.start` through `initialize()`.
- Global enabled, mute, and volume preferences are always respected.
- No audio is required to understand or complete an action.
- Playback state is represented visually and announced textually.
- Reduced-motion settings remain separate from sound preferences; the API does
  not infer that reduced motion means muted audio.
- The default pack avoids long, startling, or continuously repeating cues.

## MCP readiness

The registry and catalog metadata are serializable through public read-only
functions. A future Matriz MCP layer can expose operations such as
`listar_sons` without importing portal UI or reaching into package internals.
No MCP server, Hub tool endpoint, or agent protocol is implemented here.

## Testing and verification

Package tests cover:

- the exact canonical ID set and complete default pack;
- registry lookup and immutable metadata;
- custom pack registration, validation, and switching;
- enable/disable, mute/unmute, volume clamping, and persistence;
- playback volume composition and one-active-sound behavior;
- SSR/unsupported environments;
- autoplay rejection and first-interaction retry;
- non-blocking startup, shutdown, navigation, and interaction helpers.

Portal tests cover metrics, filters, global controls, preview state,
accessibility, and primary navigation. Browser verification covers `/sounds`
and the modified shell at desktop and mobile sizes, including keyboard and
console checks.

Before completion, run the package and portal test/lint/typecheck/build gates,
the full monorepo build/typecheck/lint/smoke/Prisma gates, and confirm existing
consumer applications still compile. No audio assets, caches, browser traces,
logs, or secrets outside the intentional package assets may become tracked.

## Completion criteria

- Components, Themes, and Sounds are visibly equal primary pillars.
- All 12 semantic events have real default assets and complete metadata.
- Consumers use one typed public API and never need physical asset knowledge.
- Registry, packs, preferences, initialization, preview, and optional
  integration contracts are functional.
- The portal retains its current identity, density, responsiveness, and
  accessibility.
- Existing applications and architectural boundaries remain green.
