import { createHash, randomUUID } from "node:crypto"
import {
  appendFile,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
} from "node:fs/promises"
import path from "node:path"
import {
  activityEventSchema,
  agentRequestSchema,
  backlogItemSchema,
  contextPolicySchema,
  projectWorkspaceSchema,
  roadmapSchema,
  workbenchDocumentSchema,
  type ActivityEvent,
  type AgentRequest,
  type BacklogItem,
  type ContextPolicy,
  type ProjectWorkspace,
  type Roadmap,
  type WorkbenchDocument,
} from "../../domain/schemas"
import {
  controlApprovalSchema,
  controlEntitySchema,
  controlNotificationSchema,
  evidenceProposalSchema,
  scorePolicySchema,
  scoreSummarySchema,
  snippetSchema,
  type ControlApproval,
  type ControlEntity,
  type ControlNotification,
  type EvidenceProposal,
  type ScorePolicy,
  type ScoreSummary,
  type Snippet,
} from "../../domain/control"
import { RevisionConflictError, WorkspaceError } from "../../domain/errors"
import { redactSensitiveText } from "../../domain/redaction"
import {
  assertAgentRequestCompletion,
  assertAgentRequestTransition,
} from "../../domain/agent-request-policy"

const MAX_JSON_BYTES = 256_000
const MAX_DOCUMENT_BYTES = 100_000
const APP_ID = /^[a-z0-9][a-z0-9-]*$/
const REPOSITORY_PROJECT_ID = "matriz-infra-hub"
const DOC_KINDS = ["product", "technical", "decision"] as const
const REPOSITORY_REFERENCE_EXCLUDED_SEGMENTS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "output",
])
const documentFolder = (kind: WorkbenchDocument["kind"]) =>
  kind === "decision" ? "decisions" : kind

export interface DiscoveredProject {
  id: string
  folderName: string
  displayName: string
  description: string
  packageName: string
  initialized: boolean
  corrupted: boolean
  relativePath: string
  topLevelFolders: string[]
  scripts: string[]
  technologies: string[]
  hasReadme: boolean
  hasAgentInstructions: boolean
  isRepositoryRoot: boolean
  workspace?: ProjectWorkspace
}

export interface ActivityQuery {
  since?: string
  until?: string
  actor?: ActivityEvent["actor"]
  entityType?: ActivityEvent["entityType"]
  text?: string
  limit?: number
}

export interface ActivityRetentionReport {
  months: number
  totalBytes: number
  oldestMonth?: string
  newestMonth?: string
  oversizedMonths: string[]
}

function now(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`
}

function revisionFor(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

async function findRepositoryRoot(start = process.cwd()): Promise<string> {
  const configured = process.env.MATRIZ_REPO_ROOT
  if (configured) {
    const candidate = path.resolve(configured)
    if (!(await exists(path.join(candidate, "pnpm-workspace.yaml")))) {
      throw new WorkspaceError("MATRIZ_REPO_ROOT não aponta para o monorepo.", "INVALID_PATH")
    }
    return candidate
  }

  let cursor = path.resolve(start)
  while (true) {
    if (await exists(path.join(cursor, "pnpm-workspace.yaml"))) return cursor
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  throw new WorkspaceError("Não foi possível localizar a raiz do monorepo.", "NOT_FOUND")
}

export class WorkspaceRepository {
  private readonly controlInitialization = new Map<string, Promise<void>>()

  private constructor(
    readonly repositoryRoot: string,
    readonly appsRoot: string,
  ) {}

  static async create(repositoryRoot?: string): Promise<WorkspaceRepository> {
    const root = repositoryRoot ? path.resolve(repositoryRoot) : await findRepositoryRoot()
    const appsRoot = path.join(root, "apps")
    const appsReal = await realpath(appsRoot)
    return new WorkspaceRepository(root, appsReal)
  }

  private async projectRoot(projectId: string): Promise<string> {
    if (!APP_ID.test(projectId)) {
      throw new WorkspaceError("Identificador de projeto inválido.", "INVALID_PATH")
    }
    const candidate = projectId === REPOSITORY_PROJECT_ID
      ? this.repositoryRoot
      : path.join(this.appsRoot, projectId)
    const resolved = await realpath(candidate).catch(() => {
      throw new WorkspaceError("Projeto não encontrado.", "NOT_FOUND")
    })
    if (
      projectId !== REPOSITORY_PROJECT_ID &&
      (!isInside(this.appsRoot, resolved) || resolved === this.appsRoot)
    ) {
      throw new WorkspaceError("Projeto fora de apps/.", "INVALID_PATH")
    }
    if (projectId === REPOSITORY_PROJECT_ID && resolved !== this.repositoryRoot) {
      throw new WorkspaceError("Raiz do repositório inválida.", "INVALID_PATH")
    }
    return resolved
  }

  private async matrixRoot(projectId: string, create = false): Promise<string> {
    const projectRoot = await this.projectRoot(projectId)
    const candidate = path.join(projectRoot, ".matriz")
    if (create) await mkdir(candidate, { recursive: true })
    const resolved = await realpath(candidate).catch(() => {
      throw new WorkspaceError("Workspace ainda não inicializado.", "NOT_INITIALIZED")
    })
    if (!isInside(projectRoot, resolved) || resolved === projectRoot) {
      throw new WorkspaceError("Workspace aponta para fora do projeto.", "INVALID_PATH")
    }
    return resolved
  }

  private async safeMatrixPath(projectId: string, segments: string[], createParent = false) {
    for (const segment of segments) {
      if (
        !segment ||
        segment === "." ||
        segment === ".." ||
        path.isAbsolute(segment) ||
        segment.includes("/") ||
        segment.includes("\\")
      ) {
        throw new WorkspaceError("Caminho de workspace inválido.", "INVALID_PATH")
      }
    }
    const matrixRoot = await this.matrixRoot(projectId, createParent)
    const target = path.join(matrixRoot, ...segments)
    if (!isInside(matrixRoot, target)) {
      throw new WorkspaceError("Caminho fora do workspace.", "INVALID_PATH")
    }
    const parent = path.dirname(target)
    if (createParent) await mkdir(parent, { recursive: true })
    const parentReal = await realpath(parent)
    if (!isInside(matrixRoot, parentReal)) {
      throw new WorkspaceError("Symlink fora do workspace.", "INVALID_PATH")
    }
    if (await exists(target)) {
      const targetReal = await realpath(target)
      if (!isInside(matrixRoot, targetReal)) {
        throw new WorkspaceError("Symlink fora do workspace.", "INVALID_PATH")
      }
    }
    return target
  }

  private async ensureMatrixDirectory(projectId: string, segments: string[]): Promise<void> {
    const target = await this.safeMatrixPath(projectId, segments, true)
    await mkdir(target, { recursive: true })
    await this.safeMatrixPath(projectId, segments)
  }

  private async readJson<T>(
    projectId: string,
    segments: string[],
    parser: { parse(value: unknown): T },
  ): Promise<T> {
    const target = await this.safeMatrixPath(projectId, segments)
    const fileStat = await stat(target).catch(() => {
      throw new WorkspaceError("Registro não encontrado.", "NOT_FOUND")
    })
    if (fileStat.size > MAX_JSON_BYTES) {
      throw new WorkspaceError("Arquivo JSON excede o limite.", "LIMIT_EXCEEDED")
    }
    try {
      return parser.parse(JSON.parse(await readFile(target, "utf8")))
    } catch (error) {
      if (error instanceof WorkspaceError) throw error
      throw new WorkspaceError("Arquivo do workspace está corrompido.", "INVALID_DATA")
    }
  }

  private async atomicWrite(projectId: string, segments: string[], value: unknown): Promise<void> {
    const target = await this.safeMatrixPath(projectId, segments, true)
    const serialized = `${JSON.stringify(value, null, 2)}\n`
    if (Buffer.byteLength(serialized) > MAX_JSON_BYTES) {
      throw new WorkspaceError("Registro excede o limite de 256 KB.", "LIMIT_EXCEEDED")
    }
    const temp = `${target}.${randomUUID()}.tmp`
    const handle = await open(temp, "wx", 0o600)
    try {
      await handle.writeFile(serialized, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temp, target)
  }

  private async discoverRepositoryProject(): Promise<DiscoveredProject | null> {
    const packagePath = path.join(this.repositoryRoot, "package.json")
    if (!(await exists(packagePath))) return null
    try {
      const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
        name?: string
        description?: string
        scripts?: Record<string, string>
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const readmePath = path.join(this.repositoryRoot, "README.md")
      const readmeTitle = await readFile(readmePath, "utf8")
        .then((readme) => readme.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "")
        .catch(() => "")
      const initialized = await exists(path.join(this.repositoryRoot, ".matriz", "project.json"))
      let workspace: ProjectWorkspace | undefined
      let corrupted = false
      if (initialized) {
        try {
          workspace = await this.readJson(
            REPOSITORY_PROJECT_ID,
            ["project.json"],
            projectWorkspaceSchema,
          )
        } catch {
          corrupted = true
        }
      }
      const dependencies = new Set([
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ])
      const topLevelFolders = (await readdir(this.repositoryRoot, { withFileTypes: true }))
        .filter(
          (item) =>
            item.isDirectory() &&
            !item.name.startsWith(".") &&
            !["node_modules", "output"].includes(item.name),
        )
        .map((item) => item.name)
        .sort()
      return {
        id: REPOSITORY_PROJECT_ID,
        folderName: path.basename(this.repositoryRoot),
        displayName: workspace?.displayName || readmeTitle || "Matriz Infra Hub",
        description: workspace?.description ?? packageJson.description ?? "",
        packageName: packageJson.name ?? "matriz",
        initialized,
        corrupted,
        relativePath: ".",
        topLevelFolders,
        scripts: Object.keys(packageJson.scripts ?? {}).sort(),
        technologies: [
          dependencies.has("next") ? "Next.js" : "",
          dependencies.has("react") ? "React" : "",
          dependencies.has("typescript") ? "TypeScript" : "",
          dependencies.has("prisma") ? "Prisma" : "",
          "Turborepo",
        ].filter(Boolean),
        hasReadme: await exists(readmePath),
        hasAgentInstructions: await exists(path.join(this.repositoryRoot, "AGENTS.md")),
        isRepositoryRoot: true,
        workspace,
      }
    } catch {
      return null
    }
  }

  async discoverProjects(): Promise<DiscoveredProject[]> {
    const entries = await readdir(this.appsRoot, { withFileTypes: true })
    const projects = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && APP_ID.test(entry.name))
        .map(async (entry): Promise<DiscoveredProject | null> => {
          const packagePath = path.join(this.appsRoot, entry.name, "package.json")
          if (!(await exists(packagePath))) return null
          try {
            const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
              name?: string
              description?: string
              scripts?: Record<string, string>
              dependencies?: Record<string, string>
              devDependencies?: Record<string, string>
            }
            let readmeTitle = ""
            const readmePath = path.join(this.appsRoot, entry.name, "README.md")
            if (await exists(readmePath)) {
              const readme = await readFile(readmePath, "utf8")
              readmeTitle = readme.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? ""
            }
            const projectPath = path.join(this.appsRoot, entry.name)
            const topLevelFolders = (await readdir(projectPath, { withFileTypes: true }))
              .filter(
                (item) =>
                  item.isDirectory() &&
                  !item.name.startsWith(".") &&
                  ![".matriz", ".next", ".turbo", "node_modules"].includes(item.name),
              )
              .map((item) => item.name)
              .sort()
            const dependencyNames = new Set([
              ...Object.keys(packageJson.dependencies ?? {}),
              ...Object.keys(packageJson.devDependencies ?? {}),
            ])
            const technologies = [
              dependencyNames.has("next") ? "Next.js" : "",
              dependencyNames.has("react") ? "React" : "",
              dependencyNames.has("typescript") ? "TypeScript" : "",
              dependencyNames.has("@prisma/client") || dependencyNames.has("prisma")
                ? "Prisma"
                : "",
              dependencyNames.has("zod") ? "Zod" : "",
            ].filter(Boolean)
            const initialized = await exists(path.join(this.appsRoot, entry.name, ".matriz", "project.json"))
            let workspace: ProjectWorkspace | undefined
            let corrupted = false
            if (initialized) {
              try {
                workspace = await this.readJson(entry.name, ["project.json"], projectWorkspaceSchema)
              } catch {
                corrupted = true
              }
            }
            return {
              id: entry.name,
              folderName: entry.name,
              displayName:
                workspace?.displayName || readmeTitle || packageJson.name || entry.name,
              description: workspace?.description ?? packageJson.description ?? "",
              packageName: packageJson.name ?? entry.name,
              initialized,
              corrupted,
              relativePath: `apps/${entry.name}`,
              topLevelFolders,
              scripts: Object.keys(packageJson.scripts ?? {}).sort(),
              technologies,
              hasReadme: await exists(readmePath),
              hasAgentInstructions: await exists(path.join(projectPath, "AGENTS.md")),
              isRepositoryRoot: false,
              workspace,
            }
          } catch {
            return null
          }
        }),
    )
    const repositoryProject = await this.discoverRepositoryProject()
    return [repositoryProject, ...projects]
      .filter((project): project is DiscoveredProject => project !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"))
  }

  async getProject(projectId: string): Promise<DiscoveredProject> {
    const project = (await this.discoverProjects()).find((item) => item.id === projectId)
    if (!project) throw new WorkspaceError("Projeto não encontrado.", "NOT_FOUND")
    return project
  }

  async initializeProject(projectId: string): Promise<ProjectWorkspace> {
    const project = await this.getProject(projectId)
    if (project.initialized && project.workspace) return project.workspace
    const timestamp = now()
    const workspaceBase = {
      schemaVersion: 1 as const,
      projectId,
      displayName: project.displayName,
      description: project.description,
      tags: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const workspace = projectWorkspaceSchema.parse({
      ...workspaceBase,
      revision: revisionFor(workspaceBase),
    })
    const roadmapBase = {
      schemaVersion: 1 as const,
      projectId,
      phases: [],
      goals: [],
      scorecards: [],
      updatedAt: timestamp,
    }
    const roadmap = roadmapSchema.parse({ ...roadmapBase, revision: revisionFor(roadmapBase) })
    const contextBase = {
      schemaVersion: 1 as const,
      defaultBudgetChars: 12000,
      absoluteBudgetChars: 40000 as const,
      includeAgentInstructions: true,
      preferredDocs: [],
      updatedAt: timestamp,
    }
    const context = contextPolicySchema.parse({
      ...contextBase,
      revision: revisionFor(contextBase),
    })
    await this.matrixRoot(projectId, true)
    for (const folder of [
      ["backlog"],
      ["docs", "product"],
      ["docs", "technical"],
      ["docs", "decisions"],
      ["agents", "requests"],
      ["activity"],
    ]) {
      await this.ensureMatrixDirectory(projectId, folder)
    }
    await this.atomicWrite(projectId, ["project.json"], workspace)
    await this.atomicWrite(projectId, ["roadmap.json"], roadmap)
    await this.atomicWrite(projectId, ["context.json"], context)
    await this.ensureControlDefaults(projectId)
    await this.appendActivity(projectId, {
      actor: "human",
      action: "project.initialized",
      summary: "Workspace local inicializado.",
      entityType: "project",
      entityId: projectId,
    })
    return workspace
  }

  private ensureControlDefaults(projectId: string): Promise<void> {
    const current = this.controlInitialization.get(projectId)
    if (current) return current
    const pending = this.initializeControlDirectories(projectId)
    this.controlInitialization.set(projectId, pending)
    return pending
  }

  private async initializeControlDirectories(projectId: string): Promise<void> {
    await this.ensureMatrixDirectory(projectId, ["control"])
    await Promise.all(["evidence", "approvals", "entities", "notifications", "insights", "snippets"].map((folder) => this.ensureMatrixDirectory(projectId, ["control", folder])))
  }

  async getControlPolicy(projectId: string): Promise<ScorePolicy> {
    await this.ensureControlDefaults(projectId)
    try {
      return await this.readJson(projectId, ["control", "policy.json"], scorePolicySchema)
    } catch (error) {
      if (!(error instanceof WorkspaceError) || error.code !== "NOT_FOUND") throw error
      const base = { schemaVersion: 1 as const, projectId, weights: { app: 0.45, docs: 0.3, "features-domains": 0.25 }, updatedAt: now() }
      return scorePolicySchema.parse({ ...base, revision: revisionFor(base) })
    }
  }

  async getControlScoreSummary(projectId: string): Promise<ScoreSummary | undefined> {
    await this.ensureControlDefaults(projectId)
    try {
      return await this.readJson(projectId, ["control", "score-summary.json"], scoreSummarySchema)
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "NOT_FOUND") return undefined
      throw error
    }
  }

  async writeControlScoreSummary(projectId: string, summary: ScoreSummary, expectedRevision?: string): Promise<ScoreSummary> {
    const current = await this.getControlScoreSummary(projectId)
    if (current && expectedRevision && current.revision !== expectedRevision) throw new RevisionConflictError()
    const next = scoreSummarySchema.parse(summary)
    await this.atomicWrite(projectId, ["control", "score-summary.json"], next)
    return next
  }

  async listControlEvidence(projectId: string): Promise<EvidenceProposal[]> {
    await this.ensureControlDefaults(projectId)
    const folder = await this.safeMatrixPath(projectId, ["control", "evidence"])
    const files = (await readdir(folder)).filter((name) => /^evp_[0-9a-f-]{36}\.json$/.test(name))
    return (await Promise.all(files.map((name) => this.readJson(projectId, ["control", "evidence", name], evidenceProposalSchema)))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async createControlEvidence(projectId: string, input: Pick<EvidenceProposal, "scorecardSlug" | "goalId" | "claim" | "references" | "source">, actor: "human" | "codex" | "agent" | "system" = "codex"): Promise<EvidenceProposal> {
    const timestamp = now()
    const base = { schemaVersion: 1 as const, id: newId("evp"), projectId, ...input, status: input.source === "deterministic" ? "approved" as const : "proposed" as const, createdAt: timestamp, updatedAt: timestamp }
    const proposal = evidenceProposalSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["control", "evidence", `${proposal.id}.json`], proposal)
    await this.appendActivity(projectId, { actor, action: "control.evidence_proposed", summary: `Evidência ${proposal.status}: ${proposal.claim}`, entityType: "roadmap", entityId: proposal.goalId })
    return proposal
  }

  async reviewControlEvidence(projectId: string, evidenceId: string, decision: "approved" | "rejected", expectedRevision: string, reviewer = "human"): Promise<EvidenceProposal> {
    const current = (await this.listControlEvidence(projectId)).find((item) => item.id === evidenceId)
    if (!current) throw new WorkspaceError("Evidência não encontrada.", "NOT_FOUND")
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const base = { ...current, status: decision, reviewedBy: reviewer, reviewedAt: now(), updatedAt: now(), revision: "" }
    const next = evidenceProposalSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["control", "evidence", `${evidenceId}.json`], next)
    const approvalBase = { schemaVersion: 1 as const, id: newId("apr"), projectId, evidenceId, decision, actor: "human" as const, note: "", createdAt: now() }
    await this.atomicWrite(projectId, ["control", "approvals", `${approvalBase.id}.json`], controlApprovalSchema.parse(approvalBase))
    await this.appendActivity(projectId, { actor: "human", action: `control.evidence_${decision}`, summary: `Evidência revisada: ${next.claim}`, entityType: "roadmap", entityId: next.goalId })
    return next
  }

  async listControlApprovals(projectId: string): Promise<ControlApproval[]> {
    await this.ensureControlDefaults(projectId)
    const folder = await this.safeMatrixPath(projectId, ["control", "approvals"])
    const files = (await readdir(folder)).filter((name) => /^apr_[0-9a-f-]{36}\.json$/.test(name))
    return Promise.all(files.map((name) => this.readJson(projectId, ["control", "approvals", name], controlApprovalSchema)))
  }

  async listControlNotifications(projectId: string): Promise<ControlNotification[]> {
    await this.ensureControlDefaults(projectId)
    const folder = await this.safeMatrixPath(projectId, ["control", "notifications"])
    const files = (await readdir(folder)).filter((name) => /^ntf_[0-9a-f-]{36}\.json$/.test(name))
    return (await Promise.all(files.map((name) => this.readJson(projectId, ["control", "notifications", name], controlNotificationSchema)))).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createControlNotification(projectId: string, input: Pick<ControlNotification, "title" | "body" | "severity" | "dedupeKey">): Promise<ControlNotification> {
    const existing = (await this.listControlNotifications(projectId)).find((item) => item.dedupeKey === input.dedupeKey)
    if (existing) return existing
    const notification = controlNotificationSchema.parse({ schemaVersion: 1, id: newId("ntf"), projectId, ...input, read: false, createdAt: now() })
    await this.atomicWrite(projectId, ["control", "notifications", `${notification.id}.json`], notification)
    return notification
  }

  async listControlEntities(projectId: string): Promise<ControlEntity[]> {
    await this.ensureControlDefaults(projectId)
    const folder = await this.safeMatrixPath(projectId, ["control", "entities"])
    const files = (await readdir(folder)).filter((name) => /^ent_[0-9a-f-]{36}\.json$/.test(name))
    return Promise.all(files.map((name) => this.readJson(projectId, ["control", "entities", name], controlEntitySchema)))
  }

  async listSnippets(projectId: string): Promise<Snippet[]> {
    await this.ensureControlDefaults(projectId)
    const folder = await this.safeMatrixPath(projectId, ["control", "snippets"])
    const files = (await readdir(folder)).filter((name) => /^snp_[0-9a-f-]{36}\.json$/.test(name))
    const defaultOrder = new Map([
      ["/contexto-curto", 0],
      ["/criterios", 1],
      ["/verificacao", 2],
      ["/handoff", 3],
    ])
    const snippets = (await Promise.all(files.map((name) => this.readJson(projectId, ["control", "snippets", name], snippetSchema)))).sort((a, b) => {
      const left = defaultOrder.get(a.command)
      const right = defaultOrder.get(b.command)
      if (left !== undefined || right !== undefined) {
        return (left ?? Number.MAX_SAFE_INTEGER) - (right ?? Number.MAX_SAFE_INTEGER)
      }
      return a.command.localeCompare(b.command)
    })
    if (snippets.length) return snippets
    return [
      ["snp_00000000-0000-0000-0000-000000000001", "/contexto-curto", "Contexto curto", "Leia o resumo do projeto, a tarefa vinculada e apenas os documentos referenciados."],
      ["snp_00000000-0000-0000-0000-000000000002", "/criterios", "Critérios de aceite", "Liste critérios de aceite observáveis e como cada um será verificado."],
      ["snp_00000000-0000-0000-0000-000000000003", "/verificacao", "Verificação", "Execute os gates do app e registre o resultado, arquivos alterados e riscos."],
      ["snp_00000000-0000-0000-0000-000000000004", "/handoff", "Handoff", "Resuma o que mudou, o que permanece pendente e o próximo passo seguro."],
    ].map(([id, command, title, content]) => snippetSchema.parse({ schemaVersion: 1, id, projectId, command, title, content, tags: ["default"], updatedAt: new Date(0).toISOString(), revision: "0000000000000000" }))
  }

  async createSnippet(projectId: string, input: Pick<Snippet, "command" | "title" | "content" | "tags">): Promise<Snippet> {
    const base = { schemaVersion: 1 as const, id: newId("snp"), projectId, ...input, updatedAt: now() }
    const snippet = snippetSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["control", "snippets", `${snippet.id}.json`], snippet)
    await this.appendActivity(projectId, { actor: "human", action: "control.snippet_created", summary: `Snippet criado: ${snippet.command}`, entityType: "project", entityId: projectId })
    return snippet
  }

  async updateSnippet(projectId: string, snippetId: string, patch: Partial<Pick<Snippet, "command" | "title" | "content" | "tags">>, expectedRevision: string): Promise<Snippet> {
    const current = (await this.listSnippets(projectId)).find((item) => item.id === snippetId)
    if (!current) throw new WorkspaceError("Snippet não encontrado.", "NOT_FOUND")
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const base = { ...current, ...patch, id: current.id, projectId, updatedAt: now(), revision: "" }
    const next = snippetSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["control", "snippets", `${snippetId}.json`], next)
    await this.appendActivity(projectId, { actor: "human", action: "control.snippet_updated", summary: `Snippet atualizado: ${next.command}`, entityType: "project", entityId: projectId })
    return next
  }

  async getWorkspace(projectId: string): Promise<ProjectWorkspace> {
    return this.readJson(projectId, ["project.json"], projectWorkspaceSchema)
  }

  async getRoadmap(projectId: string): Promise<Roadmap> {
    return this.readJson(projectId, ["roadmap.json"], roadmapSchema)
  }

  async updateRoadmap(
    projectId: string,
    phases: Roadmap["phases"],
    expectedRevision: string,
    actor: ActivityEvent["actor"] = "human",
  ) {
    const current = await this.getRoadmap(projectId)
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const base = { ...current, phases, updatedAt: now(), revision: "" }
    const next = roadmapSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["roadmap.json"], next)
    await this.appendActivity(projectId, {
      actor,
      action: "roadmap.updated",
      summary: "Roadmap atualizado.",
      entityType: "roadmap",
      entityId: projectId,
    })
    return next
  }

  async updateRoadmapGoals(
    projectId: string,
    goals: Roadmap["goals"],
    expectedRevision: string,
    actor: ActivityEvent["actor"] = "human",
  ): Promise<Roadmap> {
    const current = await this.getRoadmap(projectId)
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const base = { ...current, goals, updatedAt: now(), revision: "" }
    const next = roadmapSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["roadmap.json"], next)
    await this.appendActivity(projectId, {
      actor,
      action: "roadmap.scorecard_updated",
      summary: `Score 0–100 atualizado: ${goals.filter((goal) => goal.score === 1).length}/100.`,
      entityType: "roadmap",
      entityId: projectId,
    })
    return next
  }

  async updateRoadmapScorecards(
    projectId: string,
    scorecards: Roadmap["scorecards"],
    expectedRevision: string,
    actor: ActivityEvent["actor"] = "human",
  ): Promise<Roadmap> {
    const current = await this.getRoadmap(projectId)
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const base = { ...current, scorecards, updatedAt: now(), revision: "" }
    const next = roadmapSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["roadmap.json"], next)
    await this.appendActivity(projectId, {
      actor,
      action: "roadmap.scorecards_updated",
      summary: `${scorecards.length} trilha(s) 0–100 atualizada(s).`,
      entityType: "roadmap",
      entityId: projectId,
    })
    return next
  }

  async getContextPolicy(projectId: string): Promise<ContextPolicy> {
    return this.readJson(projectId, ["context.json"], contextPolicySchema)
  }

  async listBacklog(projectId: string): Promise<BacklogItem[]> {
    const folder = await this.safeMatrixPath(projectId, ["backlog"])
    const files = (await readdir(folder)).filter((name) => /^tsk_[0-9a-f-]{36}\.json$/.test(name))
    const items = await Promise.all(
      files.map((name) => this.readJson(projectId, ["backlog", name], backlogItemSchema)),
    )
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getBacklogItem(projectId: string, itemId: string): Promise<BacklogItem> {
    if (!/^tsk_[0-9a-f-]{36}$/.test(itemId)) {
      throw new WorkspaceError("ID de tarefa inválido.", "INVALID_PATH")
    }
    return this.readJson(projectId, ["backlog", `${itemId}.json`], backlogItemSchema)
  }

  async createBacklogItem(
    projectId: string,
    input: Pick<BacklogItem, "title" | "description" | "priority" | "tags"> & {
      acceptanceCriteria?: string[]
      workScope?: BacklogItem["workScope"]
    },
    actor: ActivityEvent["actor"] = "human",
  ): Promise<BacklogItem> {
    await this.getWorkspace(projectId)
    const timestamp = now()
    const base = {
      schemaVersion: 1 as const,
      id: newId("tsk"),
      projectId,
      title: input.title,
      description: input.description,
      status: "idea" as const,
      priority: input.priority,
      workScope: input.workScope ?? { kind: "project" as const },
      tags: input.tags,
      acceptanceCriteria: (input.acceptanceCriteria ?? []).map((text) => ({
        id: newId("ac"),
        text,
        completed: false,
      })),
      dependencyIds: [],
      references: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const item = backlogItemSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["backlog", `${item.id}.json`], item)
    await this.appendActivity(projectId, {
      actor,
      action: "backlog.created",
      summary: `Tarefa criada: ${item.title}`,
      entityType: "backlog",
      entityId: item.id,
    })
    return item
  }

  async updateBacklogItem(
    projectId: string,
    itemId: string,
    patch: Partial<Pick<BacklogItem, "title" | "description" | "status" | "priority" | "workScope" | "tags" | "acceptanceCriteria" | "dependencyIds" | "references">>,
    expectedRevision: string,
    actor: ActivityEvent["actor"] = "human",
  ): Promise<BacklogItem> {
    const current = await this.getBacklogItem(projectId, itemId)
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    if (patch.status === "done" && current.status !== "done") {
      const criteria = patch.acceptanceCriteria ?? current.acceptanceCriteria
      if (!criteria.length || criteria.some((criterion) => !criterion.completed)) {
        throw new WorkspaceError(
          "Conclua todos os critérios de aceite antes de finalizar a tarefa.",
          "INVALID_DATA",
        )
      }
      const requests = await this.listAgentRequests(projectId)
      const verified = requests.some(
        (request) =>
          request.backlogItemId === itemId &&
          request.status === "completed" &&
          request.checks.length > 0,
      )
      if (!verified) {
        throw new WorkspaceError(
          "Registre ao menos uma execução concluída com verificações antes de finalizar.",
          "INVALID_DATA",
        )
      }
    }
    if (patch.references) {
      for (const reference of patch.references) {
        if (reference.kind === "repository_file") {
          const segments = reference.path.split(/[\\/]/)
          const basename = segments.at(-1)?.toLowerCase() ?? ""
          if (
            path.isAbsolute(reference.path) ||
            segments.includes("..") ||
            segments.some((segment) =>
              REPOSITORY_REFERENCE_EXCLUDED_SEGMENTS.has(segment),
            ) ||
            basename === ".env" ||
            basename.startsWith(".env.") ||
            basename.endsWith(".log")
          ) {
            throw new WorkspaceError("Referência de arquivo fora do repositório.", "INVALID_PATH")
          }
          const target = await realpath(path.resolve(this.repositoryRoot, reference.path)).catch(() => {
            throw new WorkspaceError("Arquivo referenciado não existe.", "NOT_FOUND")
          })
          if (!isInside(this.repositoryRoot, target)) {
            throw new WorkspaceError("Referência de arquivo fora do repositório.", "INVALID_PATH")
          }
        }
        if (reference.kind === "workbench_document") {
          const documents = await this.listDocuments(projectId)
          if (!documents.some((document) => document.id === reference.documentId)) {
            throw new WorkspaceError("Documento referenciado não existe.", "NOT_FOUND")
          }
        }
      }
    }
    const base = { ...current, ...patch, id: current.id, projectId, updatedAt: now(), revision: "" }
    const next = backlogItemSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["backlog", `${itemId}.json`], next)
    await this.appendActivity(projectId, {
      actor,
      action: "backlog.updated",
      summary: `Tarefa atualizada: ${next.title} → ${next.status}`,
      entityType: "backlog",
      entityId: itemId,
    })
    return next
  }

  async listAgentRequests(projectId: string): Promise<AgentRequest[]> {
    const folder = await this.safeMatrixPath(projectId, ["agents", "requests"])
    const files = (await readdir(folder)).filter((name) => /^req_[0-9a-f-]{36}\.json$/.test(name))
    const requests = await Promise.all(
      files.map((name) =>
        this.readJson(projectId, ["agents", "requests", name], agentRequestSchema),
      ),
    )
    return requests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getAgentRequest(projectId: string, requestId: string): Promise<AgentRequest> {
    if (!/^req_[0-9a-f-]{36}$/.test(requestId)) {
      throw new WorkspaceError("ID de solicitação inválido.", "INVALID_PATH")
    }
    return this.readJson(
      projectId,
      ["agents", "requests", `${requestId}.json`],
      agentRequestSchema,
    )
  }

  async createAgentRequest(
    projectId: string,
    backlogItemId: string,
    instructions: string,
  ): Promise<AgentRequest> {
    const task = await this.getBacklogItem(projectId, backlogItemId)
    const timestamp = now()
    const base = {
      schemaVersion: 1 as const,
      id: newId("req"),
      projectId,
      backlogItemId,
      title: task.title,
      instructions,
      status: "queued" as const,
      changedFiles: [],
      checks: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const request = agentRequestSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["agents", "requests", `${request.id}.json`], request)
    await this.appendActivity(projectId, {
      actor: "human",
      action: "agent_request.created",
      summary: `Solicitação criada para: ${task.title}`,
      entityType: "agent_request",
      entityId: request.id,
    })
    return request
  }

  async updateAgentRequest(
    projectId: string,
    requestId: string,
    patch: Partial<
      Pick<
        AgentRequest,
        "status" | "claimedBy" | "resultSummary" | "changedFiles" | "checks"
      >
    >,
    expectedRevision: string,
    actor: ActivityEvent["actor"] = "agent",
  ): Promise<AgentRequest> {
    const current = await this.getAgentRequest(projectId, requestId)
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const nextStatus = patch.status ?? current.status
    assertAgentRequestTransition(current, nextStatus)
    if (nextStatus === "completed") assertAgentRequestCompletion(current, patch)
    if (nextStatus === "claimed" && !patch.claimedBy?.trim()) {
      throw new WorkspaceError("O claim exige um responsável.", "INVALID_DATA")
    }
    const base = { ...current, ...patch, id: current.id, projectId, updatedAt: now(), revision: "" }
    const next = agentRequestSchema.parse({ ...base, revision: revisionFor(base) })
    await this.atomicWrite(projectId, ["agents", "requests", `${requestId}.json`], next)
    await this.appendActivity(projectId, {
      actor,
      action: `agent_request.${next.status}`,
      summary: `Solicitação ${next.status}: ${next.title}`,
      entityType: "agent_request",
      entityId: requestId,
    })
    return next
  }

  async listDocuments(projectId: string): Promise<WorkbenchDocument[]> {
    const docs: WorkbenchDocument[] = []
    for (const kind of DOC_KINDS) {
      const folderName = documentFolder(kind)
      const folder = await this.safeMatrixPath(projectId, ["docs", folderName])
      for (const name of (await readdir(folder)).filter((item) => item.endsWith(".md"))) {
        const parsed = await this.readDocument(projectId, kind, name.slice(0, -3))
        docs.push(parsed)
      }
    }
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async readDocument(
    projectId: string,
    kind: WorkbenchDocument["kind"],
    slug: string,
  ): Promise<WorkbenchDocument> {
    if (!DOC_KINDS.includes(kind) || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      throw new WorkspaceError("Documento inválido.", "INVALID_PATH")
    }
    const target = await this.safeMatrixPath(projectId, ["docs", documentFolder(kind), `${slug}.md`])
    const fileStat = await stat(target).catch(() => {
      throw new WorkspaceError("Documento não encontrado.", "NOT_FOUND")
    })
    if (fileStat.size > MAX_DOCUMENT_BYTES) {
      throw new WorkspaceError("Documento excede 100 KB.", "LIMIT_EXCEEDED")
    }
    const source = await readFile(target, "utf8")
    const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!match) throw new WorkspaceError("Frontmatter do documento inválido.", "INVALID_DATA")
    const metadata = JSON.parse(match[1] ?? "{}") as unknown
    return workbenchDocumentSchema.parse({ ...(metadata as object), content: match[2] ?? "" })
  }

  async writeDocument(
    projectId: string,
    input: Pick<WorkbenchDocument, "kind" | "slug" | "title" | "content" | "tags">,
    expectedRevision?: string,
    actor: ActivityEvent["actor"] = "human",
  ): Promise<WorkbenchDocument> {
    if (!DOC_KINDS.includes(input.kind) || !/^[a-z0-9][a-z0-9-]*$/.test(input.slug)) {
      throw new WorkspaceError("Documento inválido.", "INVALID_PATH")
    }
    let current: WorkbenchDocument | undefined
    try {
      current = await this.readDocument(projectId, input.kind, input.slug)
    } catch (error) {
      if (!(error instanceof WorkspaceError) || error.code !== "NOT_FOUND") throw error
    }
    if (current && current.revision !== expectedRevision) throw new RevisionConflictError()
    const timestamp = now()
    const base = {
      schemaVersion: 1 as const,
      id: current?.id ?? newId("doc"),
      projectId,
      ...input,
      createdAt: current?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    const document = workbenchDocumentSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    const { content, ...metadata } = document
    const serialized = `---\n${JSON.stringify(metadata)}\n---\n${content}`
    if (Buffer.byteLength(serialized) > MAX_DOCUMENT_BYTES) {
      throw new WorkspaceError("Documento excede 100 KB.", "LIMIT_EXCEEDED")
    }
    const target = await this.safeMatrixPath(
      projectId,
      ["docs", documentFolder(input.kind), `${input.slug}.md`],
      true,
    )
    const temp = `${target}.${randomUUID()}.tmp`
    const handle = await open(temp, "wx", 0o600)
    try {
      await handle.writeFile(serialized, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temp, target)
    await this.appendActivity(projectId, {
      actor,
      action: current ? "document.updated" : "document.created",
      summary: `${current ? "Documento atualizado" : "Documento criado"}: ${document.title}`,
      entityType: "document",
      entityId: document.id,
    })
    return document
  }

  async appendActivity(
    projectId: string,
    input: Omit<
      ActivityEvent,
      "schemaVersion" | "id" | "projectId" | "occurredAt" | "metadata"
    > & { metadata?: ActivityEvent["metadata"] },
  ): Promise<ActivityEvent> {
    const event = activityEventSchema.parse({
      schemaVersion: 1,
      id: newId("evt"),
      projectId,
      occurredAt: now(),
      ...input,
      metadata: input.metadata ?? {},
    })
    const month = event.occurredAt.slice(0, 7)
    const target = await this.safeMatrixPath(projectId, ["activity", `${month}.jsonl`], true)
    await appendFile(target, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 })
    return event
  }

  async listActivity(projectId: string, since?: string, limit = 100): Promise<ActivityEvent[]> {
    return this.queryActivity(projectId, { since, limit })
  }

  async queryActivity(
    projectId: string,
    query: ActivityQuery = {},
  ): Promise<ActivityEvent[]> {
    const folder = await this.safeMatrixPath(projectId, ["activity"])
    const files = (await readdir(folder))
      .filter((name) => /^\d{4}-\d{2}\.jsonl$/.test(name))
      .sort()
      .reverse()
    const events: ActivityEvent[] = []
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500)
    const text = query.text?.trim().toLocaleLowerCase("pt-BR").slice(0, 120)
    for (const name of files) {
      const target = await this.safeMatrixPath(projectId, ["activity", name])
      const fileStat = await stat(target)
      if (fileStat.size > 2_000_000) continue
      const lines = (await readFile(target, "utf8")).split("\n").filter(Boolean).reverse()
      for (const line of lines) {
        let raw: unknown
        try {
          raw = JSON.parse(line)
        } catch {
          continue
        }
        const event = activityEventSchema.safeParse(raw)
        if (!event.success) continue
        const value = event.data
        if (query.since && value.occurredAt <= query.since) continue
        if (query.until && value.occurredAt >= query.until) continue
        if (query.actor && value.actor !== query.actor) continue
        if (query.entityType && value.entityType !== query.entityType) continue
        if (text) {
          const searchable = [
            value.summary,
            value.action,
            value.entityId,
          ].join(" ").toLocaleLowerCase("pt-BR")
          if (!searchable.includes(text)) continue
        }
        events.push({
          ...value,
          summary: redactSensitiveText(value.summary),
          entityId: redactSensitiveText(value.entityId),
        })
        if (events.length >= limit) break
      }
      if (events.length >= limit) break
    }
    return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  }

  async getActivityRetentionReport(projectId: string): Promise<ActivityRetentionReport> {
    const folder = await this.safeMatrixPath(projectId, ["activity"])
    const files = (await readdir(folder))
      .filter((name) => /^\d{4}-\d{2}\.jsonl$/.test(name))
      .sort()
    const metadata = await Promise.all(
      files.map(async (name) => ({
        name,
        size: (await stat(await this.safeMatrixPath(projectId, ["activity", name]))).size,
      })),
    )
    return {
      months: metadata.length,
      totalBytes: metadata.reduce((total, item) => total + item.size, 0),
      oldestMonth: metadata[0]?.name.slice(0, 7),
      newestMonth: metadata.at(-1)?.name.slice(0, 7),
      oversizedMonths: metadata
        .filter((item) => item.size > 2_000_000)
        .map((item) => item.name.slice(0, 7)),
    }
  }
}
