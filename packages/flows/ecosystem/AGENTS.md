# Ecosystem flow boundaries

- Responsibility: compose app switching, theme access and the shared-cache proof.
- Allowed imports: design primitives, platform configuration/storage and foundation constants.
- Forbidden imports: all `apps/*` internals and every product-domain package.
- Accepted: navigation labels, local ports, cache connectivity states.
- Rejected: domain rules or app-owned entities.
