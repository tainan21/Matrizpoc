import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, realpath, rename, stat } from "node:fs/promises"
import path from "node:path"
import {
  projectBlueprintInputSchema,
  projectBlueprintSchema,
  type ProjectBlueprint,
  type ProjectBlueprintInput,
} from "../../domain/project-blueprints"
import { RevisionConflictError, WorkspaceError } from "../../domain/errors"

const MAX_BLUEPRINT_BYTES = 128_000

const TEMPLATE_FILES: Record<ProjectBlueprintInput["templateId"], string[]> = {
  "application-next": [
    "AGENTS.md",
    "README.md",
    "package.json",
    "next-env.d.ts",
    "tsconfig.json",
    "app/layout.tsx",
    "app/page.tsx",
    "app/api/health/route.ts",
    "docs/AGENT-START-HERE.md",
    "public-contract.ts",
    "src/bootstrap/index.ts",
    "src/manifest/manifest.ts",
    ".matriz/project.json",
  ],
  "library-typescript": [
    "AGENTS.md",
    "README.md",
    "package.json",
    "docs/AGENT-START-HERE.md",
    "src/index.ts",
    ".matriz/project.json",
  ],
  "site-collection-next": [
    "AGENTS.md",
    "README.md",
    "package.json",
    "next-env.d.ts",
    "tsconfig.json",
    "app/layout.tsx",
    "app/page.tsx",
    "app/api/health/route.ts",
    "docs/AGENT-START-HERE.md",
    "public-contract.ts",
    "src/bootstrap/index.ts",
    "src/manifest/manifest.ts",
    "sites/_presets/marketing.json",
    ".matriz/project.json",
  ],
  "adopt-existing": [".matriz/project.json"],
}

function revisionFor(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16)
}

export class ProjectBlueprintRepository {
  private constructor(
    readonly repositoryRoot: string,
    private readonly blueprintsRoot: string,
  ) {}

  static async create(repositoryRoot: string): Promise<ProjectBlueprintRepository> {
    const root = await realpath(path.resolve(repositoryRoot))
    const matrixRoot = await realpath(path.join(root, ".matriz")).catch(() => {
      throw new WorkspaceError(
        "Inicialize o workspace matriz-infra-hub antes de criar blueprints.",
        "NOT_INITIALIZED",
      )
    })
    const blueprintsRoot = path.join(matrixRoot, "blueprints")
    await mkdir(blueprintsRoot, { recursive: true })
    const resolved = await realpath(blueprintsRoot)
    if (path.dirname(resolved) !== matrixRoot) {
      throw new WorkspaceError("Pasta de blueprints inválida.", "INVALID_PATH")
    }
    return new ProjectBlueprintRepository(root, resolved)
  }

  private target(id: string): string {
    if (!/^bp_[0-9a-f-]{36}$/.test(id)) {
      throw new WorkspaceError("Blueprint inválido.", "INVALID_PATH")
    }
    return path.join(this.blueprintsRoot, `${id}.json`)
  }

  private async write(blueprint: ProjectBlueprint): Promise<void> {
    const target = this.target(blueprint.id)
    const content = `${JSON.stringify(blueprint, null, 2)}\n`
    if (Buffer.byteLength(content) > MAX_BLUEPRINT_BYTES) {
      throw new WorkspaceError("Blueprint acima do limite.", "LIMIT_EXCEEDED")
    }
    const temporary = `${target}.${randomUUID()}.tmp`
    const handle = await open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(content, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
  }

  async create(input: ProjectBlueprintInput): Promise<ProjectBlueprint> {
    const parsed = projectBlueprintInputSchema.parse(input)
    const timestamp = new Date().toISOString()
    const base = {
      schemaVersion: 1 as const,
      id: `bp_${randomUUID()}`,
      ...parsed,
      status: "draft" as const,
      preview: {
        files: [...TEMPLATE_FILES[parsed.templateId]],
        notes: [
          "A prévia não cria nem altera código-fonte.",
          "A aplicação do scaffold pertence a uma solicitação Codex aprovada.",
        ],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const blueprint = projectBlueprintSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    await this.write(blueprint)
    return blueprint
  }

  async get(id: string): Promise<ProjectBlueprint> {
    const target = this.target(id)
    const metadata = await stat(target).catch(() => undefined)
    if (!metadata?.isFile() || metadata.size > MAX_BLUEPRINT_BYTES) {
      throw new WorkspaceError("Blueprint não encontrado.", "NOT_FOUND")
    }
    try {
      return projectBlueprintSchema.parse(
        JSON.parse(await readFile(target, "utf8")),
      )
    } catch {
      throw new WorkspaceError("Blueprint corrompido.", "INVALID_DATA")
    }
  }

  async markRequested(
    id: string,
    expectedRevision: string,
    links: { backlogItemId: string; agentRequestId: string },
  ): Promise<ProjectBlueprint> {
    const current = await this.get(id)
    if (current.revision !== expectedRevision) {
      throw new RevisionConflictError()
    }
    const base = {
      ...current,
      ...links,
      status: "requested" as const,
      updatedAt: new Date().toISOString(),
      revision: "",
    }
    const next = projectBlueprintSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    await this.write(next)
    return next
  }
}
