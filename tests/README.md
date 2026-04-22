# Smoke Tests (L8)

Testes leves que protegem a superfície pública da arquitetura. Rodam com:

\`\`\`
pnpm test:smoke
\`\`\`

## Cobertura obrigatória

- `manifests.test.ts` — manifests reais dos 5 apps satisfazem `AppManifestDTO` (L2)
- `registry.test.ts` — registry carrega, faz lookups por capability e por evento
- `dtos.test.ts` — amostras válidas/inválidas dos DTOs públicos principais (L7)
- `external-links.test.ts` — criação e lookup de external links
- `events.test.ts` — emit/on/history/off do bus

## Regras

- Smoke tests são **leves**. Nada de DB real, nada de network real.
- Rodam em ambiente `node` com vitest.
- Falhar aqui = PR bloqueado. São a rede de segurança dos contratos.

## Estado por CP

- CP-0: todos `it.todo`
- CP-2: `dtos`, `external-links`, `events` verdes
- CP-3: `manifests`, `registry` verdes (todos verdes)
