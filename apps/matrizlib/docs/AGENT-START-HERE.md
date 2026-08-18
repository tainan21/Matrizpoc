# MatrizLib — Agent Start Here

## Overview

MatrizLib documents and demonstrates the canonical public contracts from
`@matriz/design-system` and `@matriz/design-ui`. Components, Themes, and Sounds
are its three first-class pillars. It owns portal navigation, catalog view
models, previews, and explanatory content; it owns no product domain or
persistence.

## Read order

1. `src/manifest/manifest.ts`
2. `src/bootstrap/index.ts`
3. `public-contract.ts`
4. `src/catalog/` when the catalog is present
5. `src/sounds/` for sound catalog presenters and queries
6. `app/` for route composition

## Rules

- Keep the manifest the source of truth for public routes.
- Keep `public-contract.ts` manifest-only.
- Use public package exports; do not use deep imports or source from another
  app.
- Sound playback, registry, assets, packs, and preferences belong to
  `@matriz/design-ui/sounds`; the portal only presents serializable metadata.
- `C:\Apps\matrizlibUI` is reference-only and cannot become a dependency,
  file copy source, or alias.
