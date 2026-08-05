# Monorepo Structure

> Esqueleto. Expandido em CP-1+.

\`\`\`
Matriz/
├─ apps/
│  ├─ matriz-hub/   (Next.js 15 + public-contract.ts)
│  ├─ matriz-workbench/ (Next.js local-first + MCP STDIO)
│  ├─ spot/
│  ├─ seumei/
│  ├─ contracts/
│  ├─ willdash/
│  └─ sites/ (Next.js site collection, port 3006)
├─ packages/
│  ├─ design/ (ui, system)
│  ├─ platform/ (auth, storage, notifications, telemetry, pdf, config, i18n, env)
│  ├─ access/ (tenants, permissions)
│  ├─ integration/ (events, registry-core, manifests, external-links, api-contracts)
│  ├─ flows/ (onboarding)
│  └─ foundation/ (types, utils, constants, schemas)
├─ prisma/schemas/ (core, spot, seumei, contracts, willdash)
├─ tests/smoke/ (L8 tests)
├─ tooling/ (eslint-config, tsconfig, tailwind-preset, vitest-config)
├─ docs/ (10 globais)
├─ i18n/
└─ emails/
\`\`\`

## Convenções

- Toda pasta/arquivo em inglês.
- Cada app tem `docs/AGENT-START-HERE.md`, `README.md`, `public-contract.ts`,
  `src/manifest/manifest.ts`, `src/bootstrap/index.ts`.
- Packages usam TS puro (sem build — `exports: src/index.ts` + `transpilePackages`).
- Repositórios externos permanecem federados e são registrados no Workbench;
  caminhos locais nunca são versionados.
