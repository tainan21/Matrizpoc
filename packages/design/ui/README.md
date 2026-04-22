# @matriz/design-ui

## Responsibility (L9)
Reusable visual components. Visual-only, no domain logic.

## Exposes
- React components (buttons, cards, layouts, etc.) — arrives in CP-1.

## Must NOT import
- `@matriz/integration-*`, `@matriz/flows-*`, `apps/*` (L4).
- Any domain entity from any app (L12).
