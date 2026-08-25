import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, realpath, rename, stat } from "node:fs/promises"
import path from "node:path"
import {
  codexRunRecordSchema,
  type CodexRunRecord,
} from "../../domain/codex-run"
import { WorkspaceError } from "../../domain/errors"

const PROJECT_ID = /^[a-z0-9][a-z0-9-]*$/
const REQUEST_ID = /^req_[0-9a-f-]{36}$/
const MAX_RUN_BYTES = 256_000

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function revisionFor(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)
}

export class CodexRunStore {
  constructor(private readonly repositoryRoot: string) {}

  private async runsRoot(projectId: string, create = false): Promise<string> {
    if (!PROJECT_ID.test(projectId)) {
      throw new WorkspaceError("Identificador de projeto inválido.", "INVALID_PATH")
    }
    const appsRoot = await realpath(path.join(this.repositoryRoot, "apps"))
    const projectRoot = await realpath(path.join(appsRoot, projectId)).catch(() => {
      throw new WorkspaceError("Projeto não encontrado.", "NOT_FOUND")
    })
    if (!isInside(appsRoot, projectRoot) || projectRoot === appsRoot) {
      throw new WorkspaceError("Projeto fora de apps/.", "INVALID_PATH")
    }
    const matrixRoot = await realpath(path.join(projectRoot, ".matriz")).catch(() => {
      throw new WorkspaceError("Workspace ainda não inicializado.", "NOT_INITIALIZED")
    })
    if (!isInside(projectRoot, matrixRoot) || matrixRoot === projectRoot) {
      throw new WorkspaceError("Workspace aponta para fora do projeto.", "INVALID_PATH")
    }
    const agentsRoot = path.join(matrixRoot, "agents")
    if (create) await mkdir(agentsRoot, { recursive: true })
    const agentsReal = await realpath(agentsRoot)
    if (!isInside(matrixRoot, agentsReal)) {
      throw new WorkspaceError("Diretório de agentes fora do workspace.", "INVALID_PATH")
    }
    const runsRoot = path.join(agentsReal, "runs")
    if (create) await mkdir(runsRoot, { recursive: true })
    const runsReal = await realpath(runsRoot).catch(() => {
      throw new WorkspaceError("Nenhuma execução Codex registrada.", "NOT_FOUND")
    })
    if (!isInside(agentsReal, runsReal)) {
      throw new WorkspaceError("Diretório de runs fora do workspace.", "INVALID_PATH")
    }
    return runsReal
  }

  private target(root: string, requestId: string): string {
    if (!REQUEST_ID.test(requestId)) {
      throw new WorkspaceError("ID de solicitação inválido.", "INVALID_PATH")
    }
    return path.join(root, `${requestId}.json`)
  }

  async read(projectId: string, requestId: string): Promise<CodexRunRecord | undefined> {
    if (!REQUEST_ID.test(requestId)) {
      throw new WorkspaceError("ID de solicitação inválido.", "INVALID_PATH")
    }
    let root: string
    try {
      root = await this.runsRoot(projectId)
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "NOT_FOUND") return undefined
      throw error
    }
    const target = this.target(root, requestId)
    const metadata = await stat(target).catch(() => undefined)
    if (!metadata) return undefined
    if (metadata.size > MAX_RUN_BYTES) {
      throw new WorkspaceError("Registro de execução excede 256 KB.", "LIMIT_EXCEEDED")
    }
    try {
      return codexRunRecordSchema.parse(JSON.parse(await readFile(target, "utf8")))
    } catch {
      throw new WorkspaceError(
        "Registro de execução Codex corrompido ou incompatível.",
        "INVALID_DATA",
      )
    }
  }

  async write(
    input: Omit<CodexRunRecord, "revision" | "updatedAt" | "attempts" | "checkExecutions"> & {
      revision?: string
      updatedAt?: string
      attempts?: CodexRunRecord["attempts"]
      checkExecutions?: CodexRunRecord["checkExecutions"]
    },
  ): Promise<CodexRunRecord> {
    const root = await this.runsRoot(input.projectId, true)
    const target = this.target(root, input.requestId)
    const base = {
      ...input,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
      revision: "",
    }
    const record = codexRunRecordSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    const serialized = `${JSON.stringify(record, null, 2)}\n`
    if (Buffer.byteLength(serialized) > MAX_RUN_BYTES) {
      throw new WorkspaceError("Registro de execução excede 256 KB.", "LIMIT_EXCEEDED")
    }
    const temporary = `${target}.${randomUUID()}.tmp`
    const handle = await open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(serialized, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
    return record
  }
}
