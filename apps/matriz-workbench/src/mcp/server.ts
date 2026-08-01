import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { getAgentOperatingGuide } from "../application/agent-operating-summary"
import { buildContextBundle } from "../application/context-bundle"
import { getPackageAdoptionReadiness } from "../application/library-adoption-readiness"
import {
  buildProjectInventories,
  getProjectInventory,
} from "../application/project-inventory"
import { createProjectBlueprintWorkflow } from "../application/project-blueprints"
import { projectBlueprintInputSchema } from "../domain/project-blueprints"
import { WorkspaceError } from "../domain/errors"
import {
  agentRequestStatusSchema,
  backlogWorkScopeSchema,
  backlogStatusSchema,
  prioritySchema,
  type WorkbenchDocument,
} from "../domain/schemas"
import { FederatedSourceRepository } from "../integration/filesystem/federated-source-repository"
import { LibraryAdoptionPolicyRepository } from "../integration/filesystem/library-adoption-policy-repository"
import { ProjectBlueprintRepository } from "../integration/filesystem/project-blueprint-repository"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { SiteCatalogBridge } from "../integration/sites/site-catalog-bridge"
import { buildControlSnapshot } from "../application/control-service"
import { buildScoreSummary } from "../application/control"

async function main(): Promise<void> {
const repository = await WorkspaceRepository.create()
const federatedSources = await FederatedSourceRepository.create(repository.repositoryRoot)
const adoptionPolicies = await LibraryAdoptionPolicyRepository.create(
  repository.repositoryRoot,
)
const sites = await SiteCatalogBridge.create(repository.repositoryRoot).catch(() => undefined)

const tools = [
  {
    name: "workbench_list_projects",
    description: "Lista resumida dos apps detectados em apps/*.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_project_context",
    description: "Gera contexto compacto para um projeto, tarefa ou solicitação.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        backlogItemId: { type: "string" },
        agentRequestId: { type: "string" },
        budgetChars: { type: "integer", minimum: 1000, maximum: 40000 },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_project_inventory",
    description:
      "Lê a fotografia segura de um app: estrutura local, stack e vínculos Git/Vercel sem credenciais.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_backlog",
    description: "Lista tarefas resumidas; use get para obter conteúdo completo.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        status: { type: "string" },
        siteId: { type: "string" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_backlog_item",
    description: "Lê uma tarefa completa, critérios, referências e revision.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, itemId: { type: "string" } },
      required: ["projectId", "itemId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_read_document",
    description: "Lê um documento específico do Workbench.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        kind: { type: "string", enum: ["product", "technical", "decision"] },
        slug: { type: "string" },
      },
      required: ["projectId", "kind", "slug"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_registered_sources",
    description:
      "Lista repositórios externos registrados e sua disponibilidade local, sem expor conteúdo.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_repository_documents",
    description:
      "Lista metadados compactos dos documentos permitidos de uma fonte externa.",
    inputSchema: {
      type: "object",
      properties: { sourceId: { type: "string" } },
      required: ["sourceId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_read_repository_document",
    description:
      "Lê um documento Markdown específico que pertence ao catálogo allowlisted de uma fonte.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: { type: "string" },
        path: { type: "string" },
      },
      required: ["sourceId", "path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_registered_package_summary",
    description:
      "Projeta exports, dependencias e scripts declarados de um package pertencente a uma fonte externa registrada.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: { type: "string" },
        packageName: { type: "string" },
      },
      required: ["sourceId", "packageName"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_package_adoption_readiness",
    description:
      "Avalia, sem executar checks, a prontidao read-only de um package registrado para adocao.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: { type: "string" },
        packageName: { type: "string" },
      },
      required: ["sourceId", "packageName"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "workbench_list_agent_requests",
    description: "Lista solicitações de agentes, opcionalmente desde um status.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, status: { type: "string" } },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_control_snapshot",
    description: "Lê o painel compacto de score, evidências, aprovações e atividade do Controle.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_score_summary",
    description: "Lê o score ponderado 0-100 por trilha.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_score_evidence",
    description: "Lista evidências compactas e seu estado de revisão.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, status: { type: "string", enum: ["proposed", "approved", "rejected"] } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_approvals",
    description: "Lista decisões humanas do Controle.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_control_notifications",
    description: "Lista notificações internas deduplicadas do Controle; não substitui o outbox externo.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_entities",
    description: "Lista entidades humanas e de automação ativas no Controle.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_list_snippets",
    description: "Lista snippets curtos para handoff e contexto.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_get_site_summary",
    description:
      "Lê a projeção segura e a completude de metadata de um site do app Sites.",
    inputSchema: {
      type: "object",
      properties: { siteId: { type: "string" } },
      required: ["siteId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workbench_create_project_blueprint",
    description:
      "ESCRITA — salva uma prévia contract-first e cria backlog/solicitação Codex; não cria código-fonte. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["create", "adopt"] },
        name: { type: "string" },
        projectKind: {
          type: "string",
          enum: [
            "application",
            "library",
            "site_collection",
            "tooling",
            "external_repository",
          ],
        },
        target: { type: "string" },
        platforms: { type: "array", items: { type: "string" } },
        ownedDomains: { type: "array", items: { type: "string" } },
        consumedCapabilities: {
          type: "array",
          items: { type: "string" },
        },
        sharedCandidates: { type: "array", items: { type: "string" } },
        templateId: {
          type: "string",
          enum: [
            "application-next",
            "library-typescript",
            "site-collection-next",
            "adopt-existing",
          ],
        },
        validationCommands: { type: "array", items: { type: "string" } },
      },
      required: [
        "mode",
        "name",
        "projectKind",
        "target",
        "templateId",
        "validationCommands",
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "workbench_create_backlog_item",
    description: "ESCRITA — cria uma tarefa e registra activity. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        workScope: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["project", "site"] },
            id: { type: "string" },
          },
          required: ["kind"],
          additionalProperties: false,
        },
        tags: { type: "array", items: { type: "string" } },
        acceptanceCriteria: { type: "array", items: { type: "string" } },
      },
      required: ["projectId", "title", "priority"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_propose_site_metadata_update",
    description:
      "ESCRITA — cria tarefa e solicitação Codex para revisar metadata; não altera site.json. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
        summary: { type: "string" },
        changes: {
          type: "object",
          additionalProperties: {
            anyOf: [
              { type: "string" },
              { type: "boolean" },
              { type: "array", items: { type: "string" } },
            ],
          },
        },
      },
      required: ["siteId", "summary", "changes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_update_backlog_item",
    description: "ESCRITA — atualiza tarefa com revision otimista. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        itemId: { type: "string" },
        revision: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string" },
        priority: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["projectId", "itemId", "revision"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_append_activity",
    description: "ESCRITA — acrescenta um evento auditável. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        actor: { type: "string", enum: ["human", "codex", "agent", "system"] },
        action: { type: "string" },
        summary: { type: "string" },
        entityType: { type: "string", enum: ["project", "roadmap", "backlog", "document", "agent_request"] },
        entityId: { type: "string" },
      },
      required: ["projectId", "actor", "action", "summary", "entityType", "entityId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_claim_agent_request",
    description: "ESCRITA — atribui e inicia uma solicitação. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        requestId: { type: "string" },
        revision: { type: "string" },
        claimedBy: { type: "string" },
      },
      required: ["projectId", "requestId", "revision", "claimedBy"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_complete_agent_request",
    description: "ESCRITA — conclui solicitação com resumo, arquivos e checks. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        requestId: { type: "string" },
        revision: { type: "string" },
        resultSummary: { type: "string" },
        changedFiles: { type: "array", items: { type: "string" }, maxItems: 100 },
        checks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 100 },
      },
      required: ["projectId", "requestId", "revision", "resultSummary", "changedFiles", "checks"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_write_document",
    description: "ESCRITA — cria ou atualiza Markdown dentro de .matriz/docs. Exige aprovação humana.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        kind: { type: "string", enum: ["product", "technical", "decision"] },
        slug: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        revision: { type: "string" },
      },
      required: ["projectId", "kind", "slug", "title", "content"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_propose_score_evidence",
    description: "ESCRITA — propõe evidência para revisão humana; não concede score diretamente.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, scorecardSlug: { type: "string" }, goalId: { type: "string" }, claim: { type: "string" }, references: { type: "array", items: { type: "string" } }, source: { type: "string", enum: ["codex", "mcp", "ai", "human", "external", "deterministic"] } }, required: ["projectId", "scorecardSlug", "goalId", "claim", "source"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_review_score_evidence",
    description: "ESCRITA — aprova ou rejeita evidência com revision otimista.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, evidenceId: { type: "string" }, decision: { type: "string", enum: ["approved", "rejected"] }, revision: { type: "string" } }, required: ["projectId", "evidenceId", "decision", "revision"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_mark_control_notification",
    description: "ESCRITA — cria alerta interno deduplicado para o Controle.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, title: { type: "string" }, body: { type: "string" }, severity: { type: "string", enum: ["info", "success", "warning", "danger"] }, dedupeKey: { type: "string" } }, required: ["projectId", "title", "severity", "dedupeKey"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_create_snippet",
    description: "ESCRITA — salva snippet reutilizável dentro de .matriz/control.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, command: { type: "string" }, title: { type: "string" }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["projectId", "command", "title", "content"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "workbench_update_snippet",
    description: "ESCRITA — atualiza snippet com revision otimista.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, snippetId: { type: "string" }, revision: { type: "string" }, command: { type: "string" }, title: { type: "string" }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["projectId", "snippetId", "revision"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
] as const

const server = new Server(
  { name: "matriz-workbench", version: "0.1.0" },
  {
    capabilities: { resources: {}, tools: {} },
    instructions:
      "Leia matriz://workbench/agent-guide antes da primeira mudança. Leia somente o contexto necessário. Nunca trate Workbench como editor de código. Antes de usar qualquer tool de escrita, solicite aprovação humana. Ao concluir, registre resumo, arquivos alterados, checks e o próximo estado pendente.",
  },
)

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const projects = await repository.discoverProjects()
  return {
    resources: [
      {
        uri: "matriz://workbench/agent-guide",
        name: "Manual operacional compacto",
        mimeType: "application/json",
      },
      { uri: "matriz://projects", name: "Projetos Matriz", mimeType: "application/json" },
      ...projects
        .filter((project) => project.initialized)
        .flatMap((project) => [
          { uri: `matriz://projects/${project.id}/summary`, name: `${project.displayName} — resumo`, mimeType: "application/json" },
          { uri: `matriz://projects/${project.id}/inventory`, name: `${project.displayName} — inventário`, mimeType: "application/json" },
          { uri: `matriz://projects/${project.id}/roadmap`, name: `${project.displayName} — roadmap`, mimeType: "application/json" },
          { uri: `matriz://projects/${project.id}/control`, name: `${project.displayName} — controle`, mimeType: "application/json" },
          { uri: `matriz://projects/${project.id}/score`, name: `${project.displayName} — score`, mimeType: "application/json" },
          { uri: `matriz://projects/${project.id}/activity`, name: `${project.displayName} — atividade`, mimeType: "application/json" },
        ]),
    ],
  }
})

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    { uriTemplate: "matriz://projects/{id}/summary", name: "Resumo de projeto", mimeType: "application/json" },
    { uriTemplate: "matriz://projects/{id}/inventory", name: "Inventário de projeto", mimeType: "application/json" },
    { uriTemplate: "matriz://projects/{id}/roadmap", name: "Roadmap de projeto", mimeType: "application/json" },
    { uriTemplate: "matriz://projects/{id}/control", name: "Controle de projeto", mimeType: "application/json" },
    { uriTemplate: "matriz://projects/{id}/score", name: "Score de projeto", mimeType: "application/json" },
    { uriTemplate: "matriz://projects/{id}/activity", name: "Atividade de projeto", mimeType: "application/json" },
  ],
}))

server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
  const uri = new URL(params.uri)
  if (uri.protocol !== "matriz:") throw new Error("URI não suportada.")
  const parts = uri.pathname.split("/").filter(Boolean)
  let value: unknown
  if (uri.hostname === "workbench" && parts.join("/") === "agent-guide") {
    value = getAgentOperatingGuide()
  } else if (uri.hostname === "projects" && parts.length === 0) {
    value = (await repository.discoverProjects()).map(({ id, displayName, initialized, corrupted }) => ({
      id, displayName, initialized, corrupted,
    }))
  } else if (uri.hostname === "projects" && parts.length === 2) {
    const [projectId, resource] = parts
    if (!projectId) throw new Error("Projeto inválido.")
    if (resource === "summary") {
      const project = await repository.getProject(projectId)
      value = {
        id: project.id,
        displayName: project.displayName,
        initialized: project.initialized,
        backlog: project.initialized ? (await repository.listBacklog(projectId)).map(({ id, title, status, priority, revision }) => ({ id, title, status, priority, revision })) : [],
        agentRequests: project.initialized ? (await repository.listAgentRequests(projectId)).map(({ id, title, status, revision }) => ({ id, title, status, revision })) : [],
      }
    } else if (resource === "inventory") {
      value = await getProjectInventory(repository, projectId)
    } else if (resource === "roadmap") value = await repository.getRoadmap(projectId)
    else if (resource === "control") value = await buildControlSnapshot(repository, projectId)
    else if (resource === "score") value = (await buildControlSnapshot(repository, projectId)).projects[0]?.summary ?? null
    else if (resource === "activity") value = await repository.listActivity(projectId, undefined, 100)
    else throw new Error("Recurso não encontrado.")
  } else throw new Error("Recurso não encontrado.")
  return { contents: [{ uri: params.uri, mimeType: "application/json", text: JSON.stringify(value) }] }
})

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...tools] }))

const projectIdInput = z.object({ projectId: z.string() })
const packageAdoptionReadinessInput = z
  .object({
    sourceId: z.string(),
    packageName: z.string(),
  })
  .strict()
const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] })

server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  try {
    const input = params.arguments ?? {}
    switch (params.name) {
      case "workbench_list_projects":
        return json((await buildProjectInventories(repository)).map(({ project, local, git, vercel }) => ({
          id: project.id,
          displayName: project.name,
          initialized: project.initialized,
          corrupted: project.corrupted,
          technologies: local.technologies,
          git: { branch: git.branch, provider: git.provider, repository: git.repository },
          vercel,
        })))
      case "workbench_get_project_inventory": {
        const parsed = projectIdInput.parse(input)
        return json(await getProjectInventory(repository, parsed.projectId))
      }
      case "workbench_get_project_context": {
        const parsed = projectIdInput.extend({ backlogItemId: z.string().optional(), agentRequestId: z.string().optional(), budgetChars: z.number().int().optional() }).parse(input)
        return json(await buildContextBundle(repository, parsed.projectId, parsed))
      }
      case "workbench_list_backlog": {
        const parsed = projectIdInput
          .extend({
            status: backlogStatusSchema.optional(),
            siteId: z.string().optional(),
          })
          .parse(input)
        const items = (await repository.listBacklog(parsed.projectId)).filter(
          (item) =>
            (!parsed.status || item.status === parsed.status) &&
            (!parsed.siteId ||
              (item.workScope.kind === "site" &&
                item.workScope.id === parsed.siteId)),
        )
        return json(items.map(({ id, title, status, priority, workScope, tags, updatedAt, revision }) => ({ id, title, status, priority, workScope, tags, updatedAt, revision })))
      }
      case "workbench_get_backlog_item": {
        const parsed = projectIdInput.extend({ itemId: z.string() }).parse(input)
        return json(await repository.getBacklogItem(parsed.projectId, parsed.itemId))
      }
      case "workbench_read_document": {
        const parsed = projectIdInput.extend({ kind: z.enum(["product", "technical", "decision"]), slug: z.string() }).parse(input)
        return json(await repository.readDocument(parsed.projectId, parsed.kind, parsed.slug))
      }
      case "workbench_list_registered_sources":
        return json(
          (await federatedSources.listSources()).map(
            ({ absolutePath: _absolutePath, ...source }) => source,
          ),
        )
      case "workbench_list_repository_documents": {
        const parsed = z.object({ sourceId: z.string() }).parse(input)
        return json(await federatedSources.listDocuments(parsed.sourceId))
      }
      case "workbench_read_repository_document": {
        const parsed = z
          .object({ sourceId: z.string(), path: z.string() })
          .parse(input)
        return json(
          await federatedSources.readDocument(parsed.sourceId, parsed.path),
        )
      }
      case "workbench_get_registered_package_summary": {
        const parsed = z
          .object({ sourceId: z.string(), packageName: z.string() })
          .parse(input)
        return json(
          await federatedSources.getPackageSummary(
            parsed.sourceId,
            parsed.packageName,
          ),
        )
      }
      case "workbench_get_package_adoption_readiness": {
        const parsed = packageAdoptionReadinessInput.parse(input)
        return json(
          await getPackageAdoptionReadiness(
            repository.repositoryRoot,
            federatedSources,
            adoptionPolicies,
            parsed.sourceId,
            parsed.packageName,
          ),
        )
      }
      case "workbench_list_agent_requests": {
        const parsed = projectIdInput.extend({ status: agentRequestStatusSchema.optional() }).parse(input)
        const requests = (await repository.listAgentRequests(parsed.projectId)).filter((request) => !parsed.status || request.status === parsed.status)
        return json(requests.map(({ id, backlogItemId, title, status, claimedBy, updatedAt, revision }) => ({ id, backlogItemId, title, status, claimedBy, updatedAt, revision })))
      }
      case "workbench_get_control_snapshot": {
        const parsed = projectIdInput.parse(input)
        return json(await buildControlSnapshot(repository, parsed.projectId))
      }
      case "workbench_get_score_summary": {
        const parsed = projectIdInput.parse(input)
        return json((await buildControlSnapshot(repository, parsed.projectId)).projects[0]?.summary ?? null)
      }
      case "workbench_list_score_evidence": {
        const parsed = projectIdInput.extend({ status: z.enum(["proposed", "approved", "rejected"]).optional() }).parse(input)
        const evidence = await repository.listControlEvidence(parsed.projectId)
        return json(evidence.filter((item) => !parsed.status || item.status === parsed.status).map(({ id, scorecardSlug, goalId, claim, source, status, updatedAt, revision }) => ({ id, scorecardSlug, goalId, claim, source, status, updatedAt, revision })))
      }
      case "workbench_list_approvals": {
        const parsed = projectIdInput.parse(input)
        return json(await repository.listControlApprovals(parsed.projectId))
      }
      case "workbench_list_control_notifications": {
        const parsed = projectIdInput.parse(input)
        return json(await repository.listControlNotifications(parsed.projectId))
      }
      case "workbench_list_entities": {
        const parsed = projectIdInput.parse(input)
        return json(await repository.listControlEntities(parsed.projectId))
      }
      case "workbench_list_snippets": {
        const parsed = projectIdInput.parse(input)
        return json(await repository.listSnippets(parsed.projectId))
      }
      case "workbench_get_site_summary": {
        if (!sites) throw new Error("App Sites não está disponível.")
        const parsed = z.object({ siteId: z.string() }).parse(input)
        return json(await sites.getSite(parsed.siteId))
      }
      case "workbench_propose_score_evidence": {
        const parsed = projectIdInput.extend({ scorecardSlug: z.string(), goalId: z.string(), claim: z.string().trim().min(1).max(1000), references: z.array(z.string()).default([]), source: z.enum(["codex", "mcp", "ai", "human", "external", "deterministic"]) }).parse(input)
        return json(await repository.createControlEvidence(parsed.projectId, parsed, "codex"))
      }
      case "workbench_review_score_evidence": {
        const parsed = projectIdInput.extend({ evidenceId: z.string(), decision: z.enum(["approved", "rejected"]), revision: z.string() }).parse(input)
        const result = await repository.reviewControlEvidence(parsed.projectId, parsed.evidenceId, parsed.decision, parsed.revision, "codex")
        const [roadmap, policy, evidence] = await Promise.all([repository.getRoadmap(parsed.projectId), repository.getControlPolicy(parsed.projectId), repository.listControlEvidence(parsed.projectId)])
        await repository.writeControlScoreSummary(parsed.projectId, buildScoreSummary(roadmap, policy, evidence))
        return json(result)
      }
      case "workbench_mark_control_notification": {
        const parsed = projectIdInput.extend({ title: z.string(), body: z.string().default(""), severity: z.enum(["info", "success", "warning", "danger"]), dedupeKey: z.string() }).parse(input)
        return json(await repository.createControlNotification(parsed.projectId, parsed))
      }
      case "workbench_create_snippet": {
        const parsed = projectIdInput.extend({ command: z.string(), title: z.string(), content: z.string(), tags: z.array(z.string()).default([]) }).parse(input)
        return json(await repository.createSnippet(parsed.projectId, parsed))
      }
      case "workbench_update_snippet": {
        const parsed = projectIdInput.extend({ snippetId: z.string(), revision: z.string(), command: z.string().optional(), title: z.string().optional(), content: z.string().optional(), tags: z.array(z.string()).optional() }).parse(input)
        const { projectId, snippetId, revision, ...patch } = parsed
        return json(await repository.updateSnippet(projectId, snippetId, patch, revision))
      }
      case "workbench_create_project_blueprint": {
        const parsed = projectBlueprintInputSchema.parse(input)
        const blueprints = await ProjectBlueprintRepository.create(
          repository.repositoryRoot,
        )
        return json(
          await createProjectBlueprintWorkflow(
            repository,
            blueprints,
            parsed,
          ),
        )
      }
      case "workbench_create_backlog_item": {
        const parsed = projectIdInput.extend({ title: z.string(), description: z.string().default(""), priority: prioritySchema, workScope: backlogWorkScopeSchema.optional(), tags: z.array(z.string()).default([]), acceptanceCriteria: z.array(z.string()).default([]) }).parse(input)
        return json(await repository.createBacklogItem(parsed.projectId, parsed, "codex"))
      }
      case "workbench_propose_site_metadata_update": {
        if (!sites) throw new Error("App Sites não está disponível.")
        const parsed = z.object({
          siteId: z.string(),
          summary: z.string().trim().min(1).max(1000),
          changes: z.record(
            z.union([
              z.string().max(500),
              z.boolean(),
              z.array(z.string().max(300)).max(20),
            ]),
          ),
        }).parse(input)
        await sites.getSite(parsed.siteId)
        const created = await repository.createBacklogItem("sites", {
          title: `Revisar metadata: ${parsed.siteId}`,
          description: `${parsed.summary}\n\nProposta:\n${JSON.stringify(parsed.changes, null, 2)}`,
          priority: "medium",
          workScope: { kind: "site", id: parsed.siteId },
          tags: ["metadata", "seo"],
          acceptanceCriteria: [
            "A mudança foi revisada no diff",
            "Metadata e assets foram validados",
          ],
        }, "codex")
        const task = await repository.updateBacklogItem(
          "sites",
          created.id,
          {
            references: [{
              kind: "repository_file",
              path: `apps/sites/sites/${parsed.siteId}/site.json`,
              label: `Configuração ${parsed.siteId}`,
            }],
          },
          created.revision,
          "codex",
        )
        const request = await repository.createAgentRequest(
          "sites",
          task.id,
          "Revise a proposta, apresente o diff e solicite aprovação antes de alterar site.json.",
        )
        return json({ task, request })
      }
      case "workbench_update_backlog_item": {
        const parsed = projectIdInput.extend({ itemId: z.string(), revision: z.string(), title: z.string().optional(), description: z.string().optional(), status: backlogStatusSchema.optional(), priority: prioritySchema.optional(), tags: z.array(z.string()).optional() }).parse(input)
        const { projectId, itemId, revision, ...patch } = parsed
        return json(await repository.updateBacklogItem(projectId, itemId, patch, revision, "codex"))
      }
      case "workbench_append_activity": {
        const parsed = projectIdInput.extend({ actor: z.enum(["human", "codex", "agent", "system"]), action: z.string(), summary: z.string(), entityType: z.enum(["project", "roadmap", "backlog", "document", "agent_request"]), entityId: z.string() }).parse(input)
        const { projectId, ...event } = parsed
        return json(await repository.appendActivity(projectId, event))
      }
      case "workbench_claim_agent_request": {
        const parsed = projectIdInput.extend({ requestId: z.string(), revision: z.string(), claimedBy: z.string() }).parse(input)
        return json(await repository.updateAgentRequest(parsed.projectId, parsed.requestId, { status: "claimed", claimedBy: parsed.claimedBy }, parsed.revision, "codex"))
      }
      case "workbench_complete_agent_request": {
        const parsed = projectIdInput.extend({ requestId: z.string(), revision: z.string(), resultSummary: z.string().trim().min(1), changedFiles: z.array(z.string()).max(100), checks: z.array(z.string().trim().min(1)).min(1).max(100) }).parse(input)
        const result = await repository.updateAgentRequest(parsed.projectId, parsed.requestId, { status: "completed", resultSummary: parsed.resultSummary, changedFiles: parsed.changedFiles, checks: parsed.checks }, parsed.revision, "codex")
        const task = await repository.getBacklogItem(parsed.projectId, result.backlogItemId)
        if (task.status !== "done" && task.status !== "archived") {
          await repository.updateBacklogItem(parsed.projectId, task.id, { status: "review" }, task.revision, "codex")
        }
        return json(result)
      }
      case "workbench_write_document": {
        const parsed = projectIdInput.extend({ kind: z.enum(["product", "technical", "decision"]), slug: z.string(), title: z.string(), content: z.string(), tags: z.array(z.string()).default([]), revision: z.string().optional() }).parse(input)
        return json(await repository.writeDocument(parsed.projectId, parsed as Pick<WorkbenchDocument, "kind" | "slug" | "title" | "content" | "tags">, parsed.revision, "codex"))
      }
      default:
        throw new Error(`Tool não suportada: ${params.name}`)
    }
  } catch (error) {
    let publicMessage = "Não foi possível concluir a operação."
    if (error instanceof z.ZodError) {
      publicMessage = "Parâmetros inválidos para a tool."
    } else if (error instanceof WorkspaceError) {
      switch (error.code) {
        case "NOT_FOUND":
          publicMessage = "Fonte ou recurso não encontrado."
          break
        case "NOT_INITIALIZED":
          publicMessage = "Projeto ainda não inicializado."
          break
        case "CONFLICT":
          publicMessage = "O item mudou desde a última leitura."
          break
        case "INVALID_PATH":
          publicMessage = "Caminho ou identificador inválido."
          break
        case "INVALID_DATA":
          publicMessage = "Dados inválidos ou corrompidos."
          break
        case "LIMIT_EXCEEDED":
          publicMessage = "Limite de dados excedido."
          break
        case "RATE_LIMITED":
          publicMessage = "Limite temporário de operações atingido."
          break
      }
    }
    return {
      isError: true,
      content: [{ type: "text", text: publicMessage }],
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
console.error("Matriz Workbench MCP pronto em STDIO.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao iniciar MCP.")
  process.exitCode = 1
})
