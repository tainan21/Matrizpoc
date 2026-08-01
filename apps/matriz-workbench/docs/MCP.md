# MCP local

The project-scoped `.codex/config.toml` starts the server over STDIO. No HTTP
port is opened.

Read tools are annotated `readOnlyHint: true`. Mutation tools are explicitly
named, annotated as writes and include `ESCRITA` in their description so Codex
can request human approval. There is no generic filesystem or delete tool.

## Surfaces

Compact read tools:

- projects, inventories, backlog, documents and agent requests;
- registered external sources and their document summaries;
- one explicitly selected repository document;
- one package contract from a registered source, limited to name, version,
  exports, dependency names, peer names and script names;
- one safe Sites metadata summary.

Approved workflow writes:

- backlog and agent-request lifecycle;
- Workbench documents and activity;
- project blueprints, which create a preview and Codex request only;
- site metadata proposals, which create site-scoped work only.

Blueprint and site proposal tools never write source code. The agent changes
the repository through normal Codex permissions, with reviewable diffs.

## Exemplo compacto

Para inspecionar um package registrado sem carregar seu código:

```json
{
  "tool": "workbench_get_registered_package_summary",
  "arguments": {
    "sourceId": "matriz-lib-ui",
    "packageName": "@matriz/blocks"
  }
}
```

O retorno contém somente nome, versão, chaves de exports, nomes de
dependências, peers e scripts. A verificação executável desse contrato é
`pnpm --filter @matriz/app-matriz-workbench verify:mcp`.

Para consultar o gate de adoção sem instalar ou executar a biblioteca:

```json
{
  "tool": "workbench_get_package_adoption_readiness",
  "arguments": {
    "sourceId": "matriz-lib-ui",
    "packageName": "@matriz/tokens"
  }
}
```

Resposta compacta representativa da política inicial:

```json
{
  "sourceId": "matriz-lib-ui",
  "packageName": "@matriz/tokens",
  "status": "candidate",
  "ready": false,
  "satisfied": [
    "check:build",
    "check:typecheck",
    "evidence:apps/matriz-workbench/docs/ADR-MATRIZ-LIB-UI-BOUNDARY.md",
    "evidence:apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md",
    "export:.",
    "export:./css"
  ],
  "missing": [],
  "blockers": [
    "Nomes, CSS e versionamento ainda precisam de auditoria."
  ],
  "allowedSubpaths": [".", "./css"],
  "evidence": [
    "apps/matriz-workbench/docs/ADR-MATRIZ-LIB-UI-BOUNDARY.md",
    "apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md"
  ]
}
```

`candidate` não significa `approved`. Um package só retorna `ready: true`
quando a política o marca explicitamente como `approved`, não existem
blockers e todos os exports, scripts e documentos exigidos estão presentes.

A ferramenta é somente leitura. Ela verifica a presença declarada de scripts,
exports e evidências seguras; **não executa** build, typecheck, testes,
publicação ou instalação. O resultado comprova prontidão documental e
contratual, não a execução dos checks.

## Healthy completion

1. Read the request and compact context.
2. Claim it.
3. Change code through normal Codex filesystem permissions.
4. Run scoped checks.
5. Complete it with summary, changed files and exact commands.

The Workbench moves the linked backlog item to `review`, not directly to `done`.
