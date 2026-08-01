import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, realpath, rename, stat } from "node:fs/promises"
import path from "node:path"
import {
  deliveryReceiptSchema,
  type DeliveryReceipt,
} from "../../domain/delivery"
import { RevisionConflictError, WorkspaceError } from "../../domain/errors"

const PROJECT_ID = /^[a-z0-9][a-z0-9-]*$/
const TASK_ID = /^tsk_[0-9a-f-]{36}$/
const MAX_RECEIPT_BYTES = 16_000

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function revisionFor(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)
}

function issueIdentity(url: string): { externalId: string; normalizedUrl: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new WorkspaceError("URL da issue inválida.", "INVALID_DATA")
  }
  const allowedHost = (process.env.WORKBENCH_GITHUB_HOST ?? "github.com").toLowerCase()
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== allowedHost) {
    throw new WorkspaceError(
      `A issue deve usar HTTPS no host ${allowedHost}.`,
      "INVALID_DATA",
    )
  }
  const match = parsed.pathname.match(/^\/[^/]+\/[^/]+\/issues\/([1-9][0-9]*)\/?$/)
  if (!match) {
    throw new WorkspaceError(
      "A URL deve apontar diretamente para uma issue GitHub.",
      "INVALID_DATA",
    )
  }
  parsed.hash = ""
  parsed.search = ""
  return { externalId: match[1], normalizedUrl: parsed.toString().replace(/\/$/, "") }
}

export class DeliveryReceiptStore {
  constructor(private readonly repositoryRoot: string) {}

  private async receiptsRoot(projectId: string, create = false): Promise<string> {
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
    const target = path.join(matrixRoot, "integrations", "github", "issues")
    if (create) await mkdir(target, { recursive: true })
    const targetReal = await realpath(target).catch(() => {
      throw new WorkspaceError("Nenhum recibo GitHub registrado.", "NOT_FOUND")
    })
    if (!isInside(matrixRoot, targetReal)) {
      throw new WorkspaceError("Diretório de integrações fora do workspace.", "INVALID_PATH")
    }
    return targetReal
  }

  private target(root: string, taskId: string): string {
    if (!TASK_ID.test(taskId)) {
      throw new WorkspaceError("ID de tarefa inválido.", "INVALID_PATH")
    }
    return path.join(root, `${taskId}.json`)
  }

  async read(projectId: string, taskId: string): Promise<DeliveryReceipt | undefined> {
    if (!TASK_ID.test(taskId)) {
      throw new WorkspaceError("ID de tarefa inválido.", "INVALID_PATH")
    }
    let root: string
    try {
      root = await this.receiptsRoot(projectId)
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "NOT_FOUND") return undefined
      throw error
    }
    const target = this.target(root, taskId)
    const metadata = await stat(target).catch(() => undefined)
    if (!metadata) return undefined
    if (metadata.size > MAX_RECEIPT_BYTES) {
      throw new WorkspaceError("Recibo de entrega excede 16 KB.", "LIMIT_EXCEEDED")
    }
    try {
      return deliveryReceiptSchema.parse(JSON.parse(await readFile(target, "utf8")))
    } catch {
      throw new WorkspaceError("Recibo GitHub corrompido ou incompatível.", "INVALID_DATA")
    }
  }

  async record(input: {
    projectId: string
    taskId: string
    idempotencyKey: string
    url: string
    expectedRevision?: string
  }): Promise<DeliveryReceipt> {
    const current = await this.read(input.projectId, input.taskId)
    if (current && current.revision !== input.expectedRevision) {
      throw new RevisionConflictError()
    }
    if (!current && input.expectedRevision) {
      throw new RevisionConflictError()
    }
    const { externalId, normalizedUrl } = issueIdentity(input.url)
    const timestamp = new Date().toISOString()
    const base = {
      schemaVersion: 1 as const,
      projectId: input.projectId,
      backlogItemId: input.taskId,
      provider: "github" as const,
      kind: "issue" as const,
      idempotencyKey: input.idempotencyKey,
      externalId,
      url: normalizedUrl,
      publishedAt: current?.publishedAt ?? timestamp,
      recordedAt: timestamp,
      revision: "",
    }
    const receipt = deliveryReceiptSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    const serialized = `${JSON.stringify(receipt, null, 2)}\n`
    if (Buffer.byteLength(serialized) > MAX_RECEIPT_BYTES) {
      throw new WorkspaceError("Recibo de entrega excede 16 KB.", "LIMIT_EXCEEDED")
    }
    const root = await this.receiptsRoot(input.projectId, true)
    const target = this.target(root, input.taskId)
    const temporary = `${target}.${randomUUID()}.tmp`
    const handle = await open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(serialized, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
    return receipt
  }
}
