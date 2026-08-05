import { createHash, randomUUID } from "node:crypto"
import { open, readFile, rename, stat } from "node:fs/promises"
import path from "node:path"
import type { ZodTypeAny } from "zod"
import {
  previewReceiptSchema,
  pullRequestReceiptSchema,
  type PreviewReceipt,
  type PullRequestReceipt,
} from "../../domain/delivery"
import { RevisionConflictError, WorkspaceError } from "../../domain/errors"
import { resolveIntegrationDirectory } from "./workspace-integration-root"

const REQUEST_ID = /^req_[0-9a-f-]{36}$/
const MAX_ARTIFACT_BYTES = 32_000

function revisionFor(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)
}

function normalizedUrl(value: string, kind: "pull_request" | "preview"): URL {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new WorkspaceError("URL de entrega inválida.", "INVALID_DATA")
  }
  if (parsed.protocol !== "https:") {
    throw new WorkspaceError("A entrega externa deve usar HTTPS.", "INVALID_DATA")
  }
  if (parsed.username || parsed.password) {
    throw new WorkspaceError("A URL não pode conter credenciais.", "INVALID_DATA")
  }
  parsed.hash = ""
  parsed.search = ""

  if (kind === "pull_request") {
    const host = (process.env.WORKBENCH_GITHUB_HOST ?? "github.com").toLowerCase()
    if (parsed.hostname.toLowerCase() !== host) {
      throw new WorkspaceError(`O pull request deve usar o host ${host}.`, "INVALID_DATA")
    }
    if (!/^\/[^/]+\/[^/]+\/pull\/[1-9][0-9]*\/?$/.test(parsed.pathname)) {
      throw new WorkspaceError("A URL deve apontar diretamente para um pull request.", "INVALID_DATA")
    }
  } else {
    const configuredHost = process.env.WORKBENCH_VERCEL_PREVIEW_HOST?.toLowerCase()
    const hostname = parsed.hostname.toLowerCase()
    const allowed = configuredHost
      ? hostname === configuredHost
      : hostname.endsWith(".vercel.app") && hostname !== "vercel.app"
    if (!allowed) {
      throw new WorkspaceError(
        configuredHost
          ? `O preview deve usar o host ${configuredHost}.`
          : "O preview deve usar um domínio *.vercel.app.",
        "INVALID_DATA",
      )
    }
  }
  return parsed
}

function externalPullRequestId(url: URL): string {
  const match = url.pathname.match(/\/pull\/([1-9][0-9]*)\/?$/)
  if (!match) throw new WorkspaceError("Número do pull request inválido.", "INVALID_DATA")
  return match[1]
}

export class DeliveryArtifactStore {
  constructor(private readonly repositoryRoot: string) {}

  private target(root: string, requestId: string): string {
    if (!REQUEST_ID.test(requestId)) {
      throw new WorkspaceError("ID de solicitação inválido.", "INVALID_PATH")
    }
    return path.join(root, `${requestId}.json`)
  }

  private async readRecord<T>(
    projectId: string,
    requestId: string,
    segments: string[],
    schema: ZodTypeAny,
  ): Promise<T | undefined> {
    if (!REQUEST_ID.test(requestId)) {
      throw new WorkspaceError("ID de solicitação inválido.", "INVALID_PATH")
    }
    let root: string
    try {
      root = await resolveIntegrationDirectory(this.repositoryRoot, projectId, segments)
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "NOT_FOUND") return undefined
      throw error
    }
    const target = this.target(root, requestId)
    const metadata = await stat(target).catch(() => undefined)
    if (!metadata) return undefined
    if (metadata.size > MAX_ARTIFACT_BYTES) {
      throw new WorkspaceError("Recibo externo excede 32 KB.", "LIMIT_EXCEEDED")
    }
    try {
      return schema.parse(JSON.parse(await readFile(target, "utf8"))) as T
    } catch {
      throw new WorkspaceError("Recibo externo corrompido ou incompatível.", "INVALID_DATA")
    }
  }

  private async writeRecord<T extends { revision: string }>(
    projectId: string,
    requestId: string,
    segments: string[],
    value: T,
  ): Promise<T> {
    const serialized = `${JSON.stringify(value, null, 2)}\n`
    if (Buffer.byteLength(serialized) > MAX_ARTIFACT_BYTES) {
      throw new WorkspaceError("Recibo externo excede 32 KB.", "LIMIT_EXCEEDED")
    }
    const root = await resolveIntegrationDirectory(
      this.repositoryRoot,
      projectId,
      segments,
      true,
    )
    const target = this.target(root, requestId)
    const temporary = `${target}.${randomUUID()}.tmp`
    const handle = await open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(serialized, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
    return value
  }

  readPullRequest(projectId: string, requestId: string): Promise<PullRequestReceipt | undefined> {
    return this.readRecord<PullRequestReceipt>(
      projectId,
      requestId,
      ["github", "pull-requests"],
      pullRequestReceiptSchema,
    )
  }

  async recordPullRequest(input: {
    projectId: string
    backlogItemId: string
    requestId: string
    url: string
    baseBranch: string
    headBranch: string
    headCommit: string
    checks: string[]
    expectedRevision?: string
  }): Promise<PullRequestReceipt> {
    const current = await this.readPullRequest(input.projectId, input.requestId)
    if (current && current.revision !== input.expectedRevision) throw new RevisionConflictError()
    if (!current && input.expectedRevision) throw new RevisionConflictError()
    const url = normalizedUrl(input.url, "pull_request")
    const timestamp = new Date().toISOString()
    const base = {
      schemaVersion: 1 as const,
      projectId: input.projectId,
      backlogItemId: input.backlogItemId,
      agentRequestId: input.requestId,
      provider: "github" as const,
      kind: "pull_request" as const,
      idempotencyKey: `${input.projectId}:${input.requestId}:${input.headCommit}:pull-request`,
      externalId: externalPullRequestId(url),
      url: url.toString().replace(/\/$/, ""),
      baseBranch: input.baseBranch,
      headBranch: input.headBranch,
      headCommit: input.headCommit.toLowerCase(),
      checks: input.checks,
      publishedAt: current?.publishedAt ?? timestamp,
      recordedAt: timestamp,
      revision: "",
    }
    const receipt = pullRequestReceiptSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    return this.writeRecord(
      input.projectId,
      input.requestId,
      ["github", "pull-requests"],
      receipt,
    )
  }

  readPreview(projectId: string, requestId: string): Promise<PreviewReceipt | undefined> {
    return this.readRecord<PreviewReceipt>(
      projectId,
      requestId,
      ["vercel", "previews"],
      previewReceiptSchema,
    )
  }

  async recordPreview(input: {
    projectId: string
    backlogItemId: string
    requestId: string
    deploymentId: string
    url: string
    environment: PreviewReceipt["environment"]
    sourceCommit: string
    state: PreviewReceipt["state"]
    expectedRevision?: string
  }): Promise<PreviewReceipt> {
    const current = await this.readPreview(input.projectId, input.requestId)
    if (current && current.revision !== input.expectedRevision) throw new RevisionConflictError()
    if (!current && input.expectedRevision) throw new RevisionConflictError()
    const url = normalizedUrl(input.url, "preview")
    const timestamp = new Date().toISOString()
    const base = {
      schemaVersion: 1 as const,
      projectId: input.projectId,
      backlogItemId: input.backlogItemId,
      agentRequestId: input.requestId,
      provider: "vercel" as const,
      kind: "preview" as const,
      idempotencyKey: `${input.projectId}:${input.requestId}:${input.deploymentId}`,
      deploymentId: input.deploymentId,
      url: url.toString().replace(/\/$/, ""),
      environment: input.environment,
      sourceCommit: input.sourceCommit.toLowerCase(),
      state: input.state,
      recordedAt: timestamp,
      revision: "",
    }
    const receipt = previewReceiptSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    return this.writeRecord(
      input.projectId,
      input.requestId,
      ["vercel", "previews"],
      receipt,
    )
  }
}
