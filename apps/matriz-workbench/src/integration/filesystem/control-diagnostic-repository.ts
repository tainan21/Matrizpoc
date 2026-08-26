import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, realpath, rename } from "node:fs/promises"
import path from "node:path"
import { persistedControlDiagnosticSchema, type ControlDiagnostic } from "../../domain/control-diagnostic"
import { WorkspaceError } from "../../domain/errors"
import { controlDiagnosticSchema, type ControlDiagnosticInput } from "../control/control-contract"

const projectIdPattern = /^[a-z0-9][a-z0-9_-]{0,127}$/
const locks = new Map<string, Promise<void>>()

function revisionFor(value: Omit<ControlDiagnostic, "revision">): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function contained(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
}

async function withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => { release = resolve })
  const queued = previous.then(() => current)
  locks.set(key, queued)
  await previous
  try { return await operation() } finally {
    release()
    if (locks.get(key) === queued) locks.delete(key)
  }
}

export class ControlDiagnosticRepository {
  constructor(private readonly repositoryRoot: string) {}

  private async target(projectId: string, fingerprint: string, create = false): Promise<string> {
    if (!projectIdPattern.test(projectId)) throw new WorkspaceError("Invalid project", "INVALID_PATH")
    if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new WorkspaceError("Invalid diagnostic", "INVALID_PATH")
    const appsRoot = await realpath(path.join(this.repositoryRoot, "apps"))
    const projectRoot = await realpath(path.join(appsRoot, projectId)).catch(() => {
      throw new WorkspaceError("Project not found", "NOT_FOUND")
    })
    if (!contained(appsRoot, projectRoot)) throw new WorkspaceError("Invalid project", "INVALID_PATH")
    const folder = path.join(projectRoot, ".matriz", "diagnostics")
    if (create) await mkdir(folder, { recursive: true })
    const resolvedFolder = await realpath(folder).catch(() => folder)
    if (!contained(projectRoot, resolvedFolder)) throw new WorkspaceError("Invalid diagnostic path", "INVALID_PATH")
    return path.join(folder, `${fingerprint}.json`)
  }

  async get(projectId: string, fingerprint: string): Promise<ControlDiagnostic> {
    const target = await this.target(projectId, fingerprint)
    const source = await readFile(target, "utf8").catch(() => {
      throw new WorkspaceError("Diagnostic not found", "NOT_FOUND")
    })
    return persistedControlDiagnosticSchema.parse(JSON.parse(source))
  }

  async record(raw: ControlDiagnosticInput): Promise<{ diagnostic: ControlDiagnostic; created: boolean }> {
    if (!projectIdPattern.test(raw.projectId)) throw new WorkspaceError("Invalid project", "INVALID_PATH")
    const input = controlDiagnosticSchema.parse(raw)
    const key = `${input.projectId}:${input.fingerprint}`
    return withLock(key, async () => {
      let current: ControlDiagnostic | undefined
      try { current = await this.get(input.projectId, input.fingerprint) } catch (error) {
        if (!(error instanceof WorkspaceError) || error.code !== "NOT_FOUND") throw error
      }
      const base: Omit<ControlDiagnostic, "revision"> = {
        schemaVersion: 1,
        id: `diag_${input.fingerprint}`,
        projectId: input.projectId,
        actionId: input.actionId,
        fingerprint: input.fingerprint,
        state: current?.state ?? "open",
        occurrences: (current?.occurrences ?? 0) + 1,
        latestEvidence: input.lines,
        latestSessionId: input.sessionId,
        latestExitCode: input.exitCode,
        repairAttempts: current?.repairAttempts ?? 0,
        agentRequestId: current?.agentRequestId,
        codexRunRevision: current?.codexRunRevision,
        cooldownUntil: current?.cooldownUntil,
        rerunLease: current?.rerunLease,
        createdAt: current?.createdAt ?? input.occurredAt,
        updatedAt: input.occurredAt,
      }
      const diagnostic = persistedControlDiagnosticSchema.parse({ ...base, revision: revisionFor(base) })
      await this.atomicWrite(await this.target(input.projectId, input.fingerprint, true), diagnostic)
      return { diagnostic, created: !current }
    })
  }

  async update(
    projectId: string,
    fingerprint: string,
    expectedRevision: string,
    change: (current: ControlDiagnostic) => ControlDiagnostic,
  ): Promise<ControlDiagnostic> {
    const key = `${projectId}:${fingerprint}`
    return withLock(key, async () => {
      const current = await this.get(projectId, fingerprint)
      if (current.revision !== expectedRevision) {
        throw new WorkspaceError("Diagnostic changed", "CONFLICT")
      }
      const changed = change(current)
      if (
        changed.id !== current.id ||
        changed.projectId !== current.projectId ||
        changed.actionId !== current.actionId ||
        changed.fingerprint !== current.fingerprint ||
        changed.createdAt !== current.createdAt
      ) {
        throw new WorkspaceError("Diagnostic identity cannot change", "INVALID_DATA")
      }
      const { revision: _ignored, ...base } = changed
      const diagnostic = persistedControlDiagnosticSchema.parse({
        ...base,
        revision: revisionFor(base),
      })
      await this.atomicWrite(await this.target(projectId, fingerprint, true), diagnostic)
      return diagnostic
    })
  }

  private async atomicWrite(target: string, value: unknown): Promise<void> {
    const temp = `${target}.${randomUUID()}.tmp`
    const handle = await open(temp, "wx", 0o600)
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8")
      await handle.sync()
    } finally { await handle.close() }
    await rename(temp, target)
  }
}
