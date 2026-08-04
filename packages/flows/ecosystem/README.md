# @matriz/flows-ecosystem

## Responsibility
Composes the app switcher, theme action and local shared-cache proof. It contains no app domain.

## Boundaries
- May import visual primitives and platform configuration/storage.
- Must not import any `apps/*` source or business-domain package.

The cache proof is intentionally local and depends on the Hub at port 3000.
It is not a production persistence layer.
