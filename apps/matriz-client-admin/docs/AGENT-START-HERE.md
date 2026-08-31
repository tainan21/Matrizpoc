# Agent start here

Leia primeiro o `AGENTS.md` e o `README.md` deste app, depois:

1. `src/manifest/manifest.ts` — identidade, capability e integração pública.
2. `src/bootstrap/index.ts` — registro do app.
3. `src/server/page-data.ts` — sessão e fallback.
4. `src/presentation/dashboard-presenter.ts` — tradução para UI.
5. `src/ui/ResilientDashboard.tsx` — cache local e isolamento por tenant.
6. `desktop/src/connection.ts` — política de origem do Tauri.

As projeções e adapters pertencem a `apps/matriz-hub/src/domains/client-admin`; consuma somente o contrato público compartilhado.
