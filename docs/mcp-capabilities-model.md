# MCP Capabilities Model

Status: **contract implementado** (`ProjectMcpCapabilities` na V1.2) +
**scaffold conceitual** (sem servidor MCP real ainda).

## Problema

A Matriz quer que cada projeto declare, de forma padronizada, quais
**tools**, **resources** e **prompts** ele expõe via
[Model Context Protocol](https://modelcontextprotocol.io). Isso permite:

1. Agentes LLM descobrirem projetos Matriz e suas capabilities.
2. O Hub renderizar uma "LLM-readable surface" do ecossistema.
3. Futuramente, roteamento automático de prompts para o projeto certo.

## O que existe hoje (V1.2)

### 1. Contract `ProjectMcpCapabilities`

```ts
{
  serverName: string,
  version?: string,
  tools?: { name, description, inputSchema?: Record<string, unknown> }[],
  resources?: { uri, name, description?, mimeType? }[],
  prompts?: { name, description?, arguments?: { name, required?, description? }[] }[],
}
```

- Domain-free (L12): nada específico de Matriz, nenhum gig/contract.
- Parte opcional do `ProjectManifest` — projetos sem MCP simplesmente
  omitem.

### 2. Um projeto externo já expõe MCP simulado

`Matriz Ventures Registry` (seed) declara:

```json
"mcp": {
  "serverName": "ventures-registry-mcp",
  "tools": [
    { "name": "list_ventures", ... },
    { "name": "get_venture_health", ... }
  ]
}
```

Isso é **declarativo**. Não há servidor MCP rodando. É pura superfície
institucional.

## O que NÃO existe (escopo futuro)

1. Servidor MCP real (precisaria de runtime `@modelcontextprotocol/sdk`).
2. Execução real de tools/prompts.
3. Discovery automático (`mcp://` URIs).
4. Autenticação entre agentes e Hub.

Isso é deliberadamente fora do escopo da V1.2. O contract é a **superfície
declarativa** que prepara o terreno.

## Separação de papéis

```
ProjectManifest.capabilities (produces/consumes/exposes/requires)
  ← Visão de INTEGRAÇÃO INSTITUCIONAL (events, routes, auth, storage)

ProjectManifest.mcp
  ← Visão de CAPACIDADE LLM (tools, resources, prompts)

ProjectManifest.telemetry
  ← Visão de COMPORTAMENTO (eventos observados por categoria)
```

Os três são ortogonais e podem ser preenchidos independentemente.

## Fluxo futuro (conceitual)

```
Agente LLM
    │
    │  1. GET https://hub.matriz.example/api/institutional/mcp-index.json
    │     (agregado de todos os ProjectMcpCapabilities)
    ▼
Hub — diretório MCP
    │
    │  2. Agente escolhe projeto + tool
    ▼
Servidor MCP do projeto
    │  (fora do Hub, no repo do projeto)
```

## Mapeamento para projetos hoje

| Projeto | MCP declarado? | Observação |
|---|---|---|
| `matriz:hub` | — | Hub é control plane, não expõe tools próprios |
| `matriz:spot` | — | Candidate futuro: `search_spots`, `create_booking` |
| `matriz:seumei` | — | Candidate futuro: `list_establishments` |
| `matriz:contracts` | — | Candidate futuro: `generate_contract` |
| `matriz:willdash` | — | Candidate futuro: `create_goal` |
| `matriz:ventures-registry` | SIM (simulado) | 2 tools, 1 resource, 1 prompt |
| `matriz:spot-pay` | — | Candidate futuro: `list_payments` |

## Governança

- **Nome do server** (`serverName`) deve ser único no ecossistema. O Hub
  pode validar e alertar duplicatas.
- **InputSchema** de tool deve ser JSON Schema 2020-12 compatível.
- **Resources URIs** seguem `mcp://<serverName>/<path>`.
- **Prompts arguments** são declarativos; a execução fica no projeto.

## Próximos passos (conceitual)

- Endpoint `/api/institutional/mcp-index.json` agregando MCP de todos.
- CLI `matriz-mcp-dev` para expor um projeto via MCP em dev.
- Integração com IDE/agentes (Cursor, Claude Desktop) via manifest MCP.
- Validação Zod → JSON Schema das inputSchemas.
