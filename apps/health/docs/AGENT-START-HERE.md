# Health — Agent Start Here

Health is the experimental local observability app. Its initial scope is a registered manifest, a startup page, and a liveness route.

1. `src/manifest/manifest.ts` is this app's manifest source of truth.
2. `src/bootstrap/index.ts` is the only composition point.
3. `public-contract.ts` is the manifest-only surface other apps may import.
4. `app/` owns Next.js route handlers and pages.

Keep resource and process observation app-local. Health is read-only: it must not control processes or absorb product domain logic.
