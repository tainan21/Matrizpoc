import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import type { AgentRequest, BacklogItem, WorkbenchDocument } from "../domain/schemas"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { AGENT_OPERATING_SUMMARY } from "./agent-operating-summary"
import { redactSensitiveText } from "../domain/redaction"

export interface ContextBundle {
  projectId: string
  generatedAt: string
  budgetChars: number
  truncated: boolean
  content: string
  cursor: string
}

function section(title: string, content: string): string {
  return `## ${title}\n${content.trim()}\n`
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

async function readLinkedRepositoryFile(
  repository: WorkspaceRepository,
  relativePath: string,
): Promise<string | undefined> {
  if (
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).some((segment) => segment === "..")
  ) {
    return undefined
  }
  const root = await realpath(repository.repositoryRoot)
  const target = await realpath(path.resolve(root, relativePath)).catch(
    () => undefined,
  )
  if (!target || !isInside(root, target)) return undefined
  const metadata = await stat(target).catch(() => undefined)
  if (!metadata?.isFile() || metadata.size > 100_000) return undefined
  return redactSensitiveText(await readFile(target, "utf8"))
}

export async function buildContextBundle(
  repository: WorkspaceRepository,
  projectId: string,
  options: { backlogItemId?: string; agentRequestId?: string; budgetChars?: number } = {},
): Promise<ContextBundle> {
  const policy = await repository.getContextPolicy(projectId)
  const budget = Math.min(
    Math.max(options.budgetChars ?? policy.defaultBudgetChars, 1000),
    policy.absoluteBudgetChars,
  )
  const project = await repository.getProject(projectId)
  let task: BacklogItem | undefined
  let request: AgentRequest | undefined
  if (options.backlogItemId) task = await repository.getBacklogItem(projectId, options.backlogItemId)
  if (options.agentRequestId) {
    request = await repository.getAgentRequest(projectId, options.agentRequestId)
    task ??= await repository.getBacklogItem(projectId, request.backlogItemId)
  }

  const blocks: string[] = [
    section("Projeto", `${project.displayName} (${project.id})\n${project.description}`),
    section("Protocolo operacional do Workbench", AGENT_OPERATING_SUMMARY),
  ]

  if (policy.includeAgentInstructions) {
    const agentPath = path.join(repository.repositoryRoot, "apps", projectId, "AGENTS.md")
    try {
      blocks.push(section("Instruções locais", await readFile(agentPath, "utf8")))
    } catch {
      // An app without local instructions remains usable.
    }
  }

  if (task) {
    blocks.push(
      section(
        "Tarefa",
        [
          `${task.id} · ${task.status} · prioridade ${task.priority}`,
          task.title,
          task.description,
          task.acceptanceCriteria.length
            ? `Critérios:\n${task.acceptanceCriteria.map((item) => `- [${item.completed ? "x" : " "}] ${item.text}`).join("\n")}`
            : "",
          task.references.length
            ? `Referências:\n${task.references.map((item) => `- ${JSON.stringify(item)}`).join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      ),
    )
  }

  if (request) {
    blocks.push(
      section(
        "Solicitação do agente",
        `${request.id} · ${request.status}\n${request.instructions || "Sem instruções adicionais."}`,
      ),
    )
  }

  for (const reference of task?.references ?? []) {
    if (reference.kind !== "repository_file") continue
    const content = await readLinkedRepositoryFile(repository, reference.path)
    if (content) {
      blocks.push(
        section(
          `Arquivo vinculado · ${reference.label ?? reference.path}`,
          content,
        ),
      )
    }
  }

  const documents = await repository.listDocuments(projectId)
  const linkedIds = new Set(
    task?.references
      .filter((reference) => reference.kind === "workbench_document")
      .map((reference) => reference.documentId) ?? [],
  )
  const selectedDocs: WorkbenchDocument[] = documents.filter(
    (document) =>
      linkedIds.has(document.id) ||
      policy.preferredDocs.includes(`${document.kind}/${document.slug}`),
  )
  for (const document of selectedDocs) {
    blocks.push(section(`Documento · ${document.title}`, document.content))
  }

  const full = blocks.join("\n")
  const truncated = full.length > budget
  const content = truncated
    ? `${full.slice(0, Math.max(0, budget - 80))}\n\n[contexto truncado pelo orçamento]`
    : full
  const cursor = `${project.workspace?.revision ?? "uninitialized"}:${task?.revision ?? "none"}:${request?.revision ?? "none"}`

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    budgetChars: budget,
    truncated,
    content,
    cursor,
  }
}
