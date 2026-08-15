# @matriz/design-system

## Responsibility (L9)

Pure design tokens, metadata, brand helpers and light/dark themes for every Matriz app.

## Exposes

- `.`: primitive registries, semantic/component token names, metadata,
  light/dark app palettes and CSS-variable helpers;
- `./css`: the namespaced `[data-matrizlib]` CSS contract, including legacy aliases;
- `./metadata`: descriptive token records for tooling and documentation.

Commercial offer fields are owned by `@matriz/flows-themes`; visual theme
definitions intentionally contain no pricing or entitlement policy.

## Must NOT import

- Any domain or integration package (L4).
