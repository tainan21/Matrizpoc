# Auditorias e entregas faseadas

Este diretório concentra os documentos de auditoria e entrega de cada
evolução maior da Matrizpoc. Ordem cronológica, do mais antigo para o
mais recente:

## V1.1 — Baseline técnico (auth + extração)

- [v1.1-baseline.md](./v1.1-baseline.md) — estado inicial: auth real
  cross-app (OTP + magic link), 5 apps com layout semântico, scaffolds
  de extração e deploy.

## V1.2 — Camada institucional (control plane)

- [v1.2-institutional.md](./v1.2-institutional.md) — Hub como control
  plane, ingestion institucional, classificação de fontes, telemetry
  institucional, modelo de MCP e registry.

## V1.3 — Backend real (persistência e auth cross-app)

- [v1.3-backend-real-plan.md](./v1.3-backend-real-plan.md) — auditoria
  técnica, diagnóstico de gaps, proposta de modelagem e plano por fases.
- [v1.3-delivery.md](./v1.3-delivery.md) — **entrega final**, com diffs,
  decisões tomadas, estrutura do `@matriz/platform-db`, primitivas do
  `@matriz/platform-auth/server-db`, MCP real do Hub e prova dos 4
  fluxos.

## Como ler

- Para **onboarding rápido**: leia `v1.3-delivery.md` primeiro — resume
  o estado atual e aponta para as leis e docs arquiteturais.
- Para **entender a evolução**: leia em ordem cronológica (V1.1 → V1.2
  → V1.3).
- Para **planejar a próxima fase**: veja o §9 "Próximos passos sugeridos"
  de `v1.3-delivery.md`.
