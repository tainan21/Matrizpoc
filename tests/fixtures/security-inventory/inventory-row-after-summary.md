## HTTP Route Handlers — 1 entries

| ID | Source | Function/tool | Effect | Profile |
| --- | --- | --- | --- | --- |
| `HTTP:fixture:GET:/api/example` | `apps/fixture/app/api/example/route.ts:7` | `GET` | R | `H-R` |

## Workbench Server Actions — 1 entries

| ID | Source | Function/tool | Effect | Profile |
| --- | --- | --- | --- | --- |
| `ACTION:fixture:saveAction` | `apps/fixture/app/actions.ts:5` | `saveAction` | M | `WB-A` |

## MCP tools — 1 entries

| ID | Source | Function/tool | Effect | Profile |
| --- | --- | --- | --- | --- |
| `MCP:fixture:valid_tool` | `apps/fixture/src/mcp.ts:7` | `valid_tool` | R | `WB-MCP-R` |

## Counts and zero-endpoint apps

Current tracked-source count: **3** = 1 HTTP methods (1 Hub, 0 Workbench),
1 Workbench Server Actions, and 1 MCP tools (0 Hub/MatrizDocs, 1 Workbench).
HTTP mutations: 1; HTTP reads/preflight: 0. The AST inventory adds five
mock-auth `OPTIONS` aliases that a declaration-only scan missed.

`spot`, `seumei`, `contracts`, `willdash`, and `sites` have **zero request
handlers, exported Server Actions, and declared MCP tools** in tracked app
source. Their page-level mock/domain operations are intentionally not counted
as request-facing endpoints.

| `MCP:fixture:injected_after_summary` | `apps/fixture/src/mcp.ts:9` | `injected_after_summary` | M | `WB-MCP-M` |
