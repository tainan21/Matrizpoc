# @matriz/design-ui

## Responsibility (L9)

Reusable visual components without product-domain behavior.

## Exposes

- Stable public entry points: `@matriz/design-ui`, `/primitives`, `/styles.css`, and `/metadata`;
- layout components: `Stack`, `Inline`, `Container`, and `Surface`;
- typography and actions: `Heading`, `Text`, and `Button`;
- accessible forms: `Label`, `Input`, and `FormField`;
- feedback and context: `Badge`, `Alert`, `EmptyState`, and `InfoHint`;
- single-source `componentMetadata` for catalogs and tooling;
- `ThemeController` and `ThemeToggle` for the shared color-mode contract;
- `@matriz/design-ui/sounds` for the typed, opt-in sound registry, packs,
  preferences, runtime, and framework-neutral feedback helpers;
- `MatrizAuthLayout` for the visual-only 50/50 authentication composition.

Product copy, authentication rules and domain behavior stay in each app.

## Sounds

Consumers call semantic IDs through `sound.play("notification")` or the
optional navigation/interaction helpers. They do not create browser audio
elements, import physical WAV files, or assume which pack is active. The
internal browser driver owns playback; packs own asset replacement; global
enable, mute, and volume preferences are respected by every call.

Sound feedback is optional and never replaces visual state, accessible copy,
focus management, or a product operation. No component plays audio by default.

Import `@matriz/design-ui/styles.css` once in an application root. The stylesheet
imports the public `@matriz/design-system/css` contract and all new component
styles consume semantic `--matriz-*` tokens. Existing compatibility utilities
remain available during migration.

## Must NOT import

- `@matriz/integration-*`, `@matriz/flows-*` or `apps/*` (L4);
- any domain entity from an app (L12).
