# Package Categories

6 categorias, 21 packages na V1.

## `design/` — visual compartilhado

- `ui` — componentes base reutilizáveis
- `system` — tokens, temas, identidade

Regra: **não** importa regra de negócio nem contratos.

## `platform/` — infra técnica leve

- `auth` — tipos/fluxos mock de auth
- `storage` — wrapper localStorage + in-memory com namespaces
- `notifications` — tipos/fila mock
- `telemetry` — motor base
- `pdf` — renderização mock de documento
- `config` — config + feature flags (L10)
- `i18n` — base de traduções
- `env` — contratos de environment

## `access/` — contexto de acesso

- `tenants` — tipos, hooks, helpers de tenant
- `permissions` — modelos e utils mock de autorização

## `integration/` — comunicação pública

- `events` — event bus mock (híbrido cross-origin)
- `registry-core` — helpers para registry (L2: não é autoritativo)
- `manifests` — tipos de manifest
- `external-links` — tipos e helpers
- `api-contracts` — DTOs versionados (L7)

## `flows/` — fluxos compartilháveis

- `onboarding` — fluxo compartilhado com extensões por app

## `foundation/` — base

- `types` — primitivos e tipos públicos
- `utils` — helpers estáveis
- `constants` — enums/constants
- `schemas` — Zod base

## Regra geral

Ver L12: packages **não** carregam domínio forte. Shared significa infraestrutura,
contrato público ou contexto — não regras de Spot/Seumei/Contracts/WillDash.
