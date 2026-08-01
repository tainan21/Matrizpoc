# Coworking, API e MCP

## Fluxo recomendado

1. humano registra outcome ou tarefa;
2. Workbench calcula prontidão, lacunas e bloqueios;
3. humano completa somente o contexto necessário;
4. Codex lê projeto, tarefa e referências via MCP;
5. Codex altera código usando as permissões normais do repositório;
6. verificações, arquivos e resumo retornam ao Workbench;
7. humano revisa e aceita;
8. score muda apenas se houver evidência de outcome.

## API local do Workbench

As rotas HTTP atuais são internas à interface, protegidas pela sessão local e
não formam ainda uma API pública estável:

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/api/codex/runtime` | diagnosticar runtime Codex |
| `POST` | `/api/codex/projects/:projectId/requests/:requestId/start` | iniciar execução |
| `GET` | `/api/codex/projects/:projectId/requests/:requestId/events` | transmitir eventos |
| `POST` | `/api/codex/projects/:projectId/requests/:requestId/cancel` | cancelar execução |
| `POST` | `/api/codex/projects/:projectId/requests/:requestId/approvals/:approvalId` | responder aprovação |
| `POST` | `/api/collaboration/projects/:projectId/github/issues/:taskId` | registrar issue aprovada |
| `POST` | `/api/collaboration/projects/:projectId/github/pull-requests/:requestId` | registrar PR |
| `POST` | `/api/collaboration/projects/:projectId/vercel/previews/:requestId` | registrar preview |
| `POST` | `/api/collaboration/projects/:projectId/notifications/config` | configurar notificações |
| `POST` | `/api/collaboration/projects/:projectId/notifications/outbox/:notificationId` | operar outbox |

Não consuma essas rotas fora do app sem antes promover DTOs e versionamento
para um contrato público.

## MCP

O MCP STDIO é a integração suportada para Codex e clientes compatíveis. Ele
não abre porta HTTP.

Resources:

- `matriz://workbench/agent-guide`
- `matriz://projects`
- `matriz://projects/{id}/summary`
- `matriz://projects/{id}/inventory`
- `matriz://projects/{id}/roadmap`
- `matriz://projects/{id}/activity`

Tools de leitura:

- `workbench_list_projects`
- `workbench_get_project_context`
- `workbench_get_project_inventory`
- `workbench_list_backlog`
- `workbench_get_backlog_item`
- `workbench_read_document`
- `workbench_list_agent_requests`

Tools de escrita:

- `workbench_create_backlog_item`
- `workbench_update_backlog_item`
- `workbench_append_activity`
- `workbench_claim_agent_request`
- `workbench_complete_agent_request`
- `workbench_write_document`

Não existe tool genérica de filesystem, shell ou delete. Escritas exigem
aprovação.

## Consumo pelo Codex

Sequência mínima:

1. listar projetos;
2. ler inventory/summary do projeto;
3. ler uma tarefa específica;
4. solicitar contexto compacto;
5. executar a mudança no repositório;
6. completar a solicitação com checks e arquivos.

Listagens retornam resumos. Conteúdo completo exige chamada específica. Isso
reduz tokens e evita despejar o repositório inteiro no contexto.

## Backlog público

“Público” significa legível e versionável no repositório, não exposto à
internet. A fonte canônica é:

```text
<projeto>/.matriz/backlog/tsk_<uuid>.json
```

UI e MCP são projeções desse estado. Integração futura com GitHub sincroniza
entrega e colaboração, mas não substitui automaticamente a fonte local.
