# Migrating to MatrizLib public contracts

The portal is an adoption guide, not an alternate package. Consumers migrate
to `@matriz/design-system` and `@matriz/design-ui`; they never import from
`apps/matrizlib`.

## Allowed imports

Use published surfaces only:

```ts
import { appThemes } from "@matriz/design-system"
import "@matriz/design-system/css"
import { Button } from "@matriz/design-ui"
import "@matriz/design-ui/styles.css"
import { componentMetadata } from "@matriz/design-ui/metadata"
```

Never import `packages/design/**/src/**`, `apps/**`, an external library, or
internal barrels. A design package never receives a repository, DTO, entity,
price/tenant policy, or remote theme selection.

## Safe path

1. Map the local surface; keep presenter, use case, auth, and state in the app.
2. Add public CSS first and preserve existing theme attributes. Workbench keeps
   cookie SSR; Hub Alpha keeps `--hub-*` and its 3D boundary.
3. Replace only compatible primitives through public imports. Keep product copy
   and domain semantics local.
4. Validate DOM, keyboard/focus, error, long content, light/dark, reduced motion,
   and mobile when the surface supports them.
5. Record old aliases/APIs as `migrate-later` or `deprecate`; remove only after
   an audited consumer migration.

If a replacement changes product behavior or needs a domain contract, revert the
surface to app-local. Do not create a shared package to bypass that boundary.

## Candidate promotion

A C001-C099 candidate becomes `available` only after the public package exports
the implementation and publishes matching component metadata. Before promotion:

1. prove two independent consumers and stable visual semantics;
2. keep entities, repositories, routing, copy, and authorization app-local;
3. cover keyboard, focus, error, long-content, reduced-motion, light/dark, and
   mobile behavior;
4. add the public export and metadata in the owning design package;
5. update the portal entry without inventing an alias or deep import.

The current backlog is 85 candidates. C019-C022 are especially important to
reconcile: the audit found related public exports, but they do not yet have a
matching canonical component-metadata contract. Their candidate status prevents
the portal from promising an unsupported import surface.
