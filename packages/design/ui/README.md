# @matriz/design-ui

## Responsibility (L9)

Reusable visual components without product-domain behavior.

## Exposes

- React primitives such as buttons, cards, typography and layouts;
- `ThemeController` and `ThemeToggle` for the shared color-mode contract;
- `MatrizAuthLayout` for the visual-only 50/50 authentication composition.

Product copy, authentication rules and domain behavior stay in each app.

## Must NOT import

- `@matriz/integration-*`, `@matriz/flows-*` or `apps/*` (L4);
- any domain entity from an app (L12).
