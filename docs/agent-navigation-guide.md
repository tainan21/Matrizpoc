# Agent Navigation Guide

> Como agentes (e humanos com pressa) devem ler este repositório
> sem varrer tudo toda vez.

## Regra de ouro

**Nunca escaneie o repo inteiro.** Comece sempre por este guia.

## Fluxo de leitura

1. **Sempre**: `docs/architectural-laws.md` (12 leis duras).
2. **Depois**, pelo seu alvo:
   - Mexer em um app → `apps/<app>/docs/AGENT-START-HERE.md` →
     `apps/<app>/src/manifest/manifest.ts` → `apps/<app>/src/bootstrap/index.ts`.
   - Adicionar DTO → `packages/integration/api-contracts/README.md`.
   - Adicionar evento → `docs/events-conventions.md`.
   - Adicionar external link → `docs/external-links.md`.
   - Entender comunicação cross-app → `docs/app-ownership-map.md`.

## Pastas por tipo de tarefa

| Tarefa | Onde olhar |
|---|---|
| Criar/editar uma tela | `apps/<app>/src/ui/screens`, `ui/components` |
| Adicionar use case | `apps/<app>/src/application/use-cases` |
| Adicionar entidade interna | `apps/<app>/src/domain/models` |
| Expor contrato público | `packages/integration/api-contracts/src/v1` |
| Adapter/mapper entre contrato e entidade | `apps/<app>/src/integration/adapters|mappers` |
| Chamar outro app | `apps/<app>/src/integration/gateways` |
| Mock de dados | `apps/<app>/src/mock/data` + `mock/repositories` |
| Evento cross-app | `packages/integration/events` |
| Feature flag | `packages/platform/config` |

## O que NÃO fazer

- Importar `apps/<X>/src/**` de dentro de `apps/<Y>` (L3/L4).
- Colocar regra de domínio em `packages/*` (L12).
- Acessar seeds diretamente na UI (L5).
- Tipar componentes em entity crua (L6).
- Duplicar manifest em package central (L2).
