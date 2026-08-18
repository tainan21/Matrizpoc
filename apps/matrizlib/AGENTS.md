# MatrizLib agent instructions

## Scope

MatrizLib is the public, domain-free reference portal for the Matriz design
system and UI package. Keep all portal-specific code inside `apps/matrizlib`.

## Routes

- `/` — editorial entry point.
- `/components` and `/components/[slug]` — component catalog.
- `/themes` — canonical theme laboratory.
- `/architecture` — package ownership and migration guidance.

## Boundaries

- Import other apps only through their `public-contract.ts` when a manifest is
  required; never import `apps/<app>/src/**`.
- Consume stable design and integration APIs through their public package
  exports only.
- Keep catalog entries, presenters, route composition, and documentation local.
- Do not add a database, repository, product-domain entity, product event, or
  external runtime dependency for `C:\Apps\matrizlibUI`.

## Before a PR

Run `pnpm --filter @matriz/app-matrizlib test`, `typecheck`, and `lint`.
Check that `public-contract.ts` exports only the manifest surface and that no
build output, screenshots, logs, or `.env` files are staged.
