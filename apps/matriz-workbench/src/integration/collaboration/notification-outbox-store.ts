import { createHash, randomUUID } from "node:crypto"
import { open, readFile, readdir, rename, stat } from "node:fs/promises"
import path from "node:path"
import {
  notificationConfigSchema,
  notificationDeliveryReceiptSchema,
  notificationOutboxItemSchema,
  type NotificationDeliveryReceipt,
  type NotificationChannel,
  type NotificationConfig,
  type NotificationEvent,
  type NotificationOutboxItem,
} from "../../domain/notification"
import { RevisionConflictError, WorkspaceError } from "../../domain/errors"
import { redactOperationalText, redactSensitiveText } from "../../domain/redaction"
import { resolveIntegrationDirectory } from "./workspace-integration-root"

const MAX_RECORD_BYTES = 32_000
const NOTIFICATION_ID = /^ntf_[0-9a-f-]{36}$/
const MAX_ATTEMPTS = 20

function revisionFor(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)
}

function defaultConfig(): NotificationConfig {
  const value = {
    schemaVersion: 1 as const,
    enabled: false,
    channels: [] as NotificationChannel[],
    events: [] as NotificationEvent[],
    redaction: {
      includeSummary: true,
      includeFilePaths: false,
      includeExternalUrls: false,
    },
    updatedAt: new Date(0).toISOString(),
    revision: "",
  }
  return { ...value, revision: revisionFor(value) }
}

async function readBoundedJson(target: string): Promise<unknown> {
  const metadata = await stat(target).catch(() => undefined)
  if (!metadata) return undefined
  if (metadata.size > MAX_RECORD_BYTES) {
    throw new WorkspaceError("Registro de notificação excede 32 KB.", "LIMIT_EXCEEDED")
  }
  try {
    return JSON.parse(await readFile(target, "utf8"))
  } catch {
    throw new WorkspaceError("Registro de notificação corrompido.", "INVALID_DATA")
  }
}

async function atomicWrite(target: string, value: unknown): Promise<void> {
  const serialized = `${JSON.stringify(value, null, 2)}\n`
  if (Buffer.byteLength(serialized) > MAX_RECORD_BYTES) {
    throw new WorkspaceError("Registro de notificação excede 32 KB.", "LIMIT_EXCEEDED")
  }
  const temporary = `${target}.${randomUUID()}.tmp`
  const handle = await open(temporary, "wx")
  try {
    await handle.writeFile(serialized, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }
  await rename(temporary, target)
}

export interface EnqueueNotificationInput {
  event: NotificationEvent
  idempotencyKey: string
  title: string
  body?: string
  workbenchPath: string
  backlogItemId?: string
  agentRequestId?: string
}

export class NotificationOutboxStore {
  constructor(private readonly repositoryRoot: string) {}

  private async getRecordTarget(
    projectId: string,
    notificationId: string,
  ): Promise<string> {
    if (!NOTIFICATION_ID.test(notificationId)) {
      throw new WorkspaceError("ID de notificação inválido.", "INVALID_PATH")
    }
    const root = await resolveIntegrationDirectory(
      this.repositoryRoot,
      projectId,
      ["notifications", "outbox"],
    )
    return path.join(root, `${notificationId}.json`)
  }

  private async readRecord(target: string): Promise<NotificationOutboxItem> {
    const parsed = notificationOutboxItemSchema.safeParse(await readBoundedJson(target))
    if (!parsed.success) {
      throw new WorkspaceError("Registro de notificação incompatível.", "INVALID_DATA")
    }
    return parsed.data
  }

  private async updateRecord(
    target: string,
    current: NotificationOutboxItem,
    expectedRevision: string,
    changes: Partial<NotificationOutboxItem>,
  ): Promise<NotificationOutboxItem> {
    if (current.revision !== expectedRevision) throw new RevisionConflictError()
    const base = {
      ...current,
      ...changes,
      revision: "",
    }
    const next = notificationOutboxItemSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    await atomicWrite(target, next)
    return next
  }

  async getConfig(projectId: string): Promise<NotificationConfig> {
    let root: string
    try {
      root = await resolveIntegrationDirectory(
        this.repositoryRoot,
        projectId,
        ["notifications"],
      )
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "NOT_FOUND") return defaultConfig()
      throw error
    }
    const raw = await readBoundedJson(path.join(root, "config.json"))
    if (!raw) return defaultConfig()
    const parsed = notificationConfigSchema.safeParse(raw)
    if (!parsed.success) {
      throw new WorkspaceError("Configuração de notificação incompatível.", "INVALID_DATA")
    }
    return parsed.data
  }

  async updateConfig(
    projectId: string,
    patch: Pick<NotificationConfig, "enabled" | "channels" | "events" | "redaction">,
    expectedRevision: string,
  ): Promise<NotificationConfig> {
    const current = await this.getConfig(projectId)
    if (current.revision !== expectedRevision) {
      throw new RevisionConflictError()
    }
    const root = await resolveIntegrationDirectory(
      this.repositoryRoot,
      projectId,
      ["notifications"],
      true,
    )
    const base = {
      schemaVersion: 1 as const,
      ...patch,
      channels: Array.from(new Set(patch.channels)),
      events: Array.from(new Set(patch.events)),
      updatedAt: new Date().toISOString(),
      revision: "",
    }
    const next = notificationConfigSchema.parse({
      ...base,
      revision: revisionFor(base),
    })
    await atomicWrite(path.join(root, "config.json"), next)
    return next
  }

  async list(projectId: string): Promise<NotificationOutboxItem[]> {
    let root: string
    try {
      root = await resolveIntegrationDirectory(
        this.repositoryRoot,
        projectId,
        ["notifications", "outbox"],
      )
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "NOT_FOUND") return []
      throw error
    }
    const names = (await readdir(root))
      .filter((name) => /^ntf_[0-9a-f-]{36}\.json$/.test(name))
      .slice(0, 1_000)
    const records = await Promise.all(
      names.map(async (name) => {
        const parsed = notificationOutboxItemSchema.safeParse(
          await readBoundedJson(path.join(root, name)),
        )
        if (!parsed.success) {
          throw new WorkspaceError(
            `Registro de notificação incompatível: ${name}.`,
            "INVALID_DATA",
          )
        }
        return parsed.data
      }),
    )
    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  async enqueue(
    projectId: string,
    input: EnqueueNotificationInput,
  ): Promise<NotificationOutboxItem[]> {
    const config = await this.getConfig(projectId)
    if (!config.enabled || !config.events.includes(input.event)) return []
    const existing = await this.list(projectId)
    const root = await resolveIntegrationDirectory(
      this.repositoryRoot,
      projectId,
      ["notifications", "outbox"],
      true,
    )
    const created: NotificationOutboxItem[] = []
    for (const channel of config.channels) {
      const key = `${input.idempotencyKey}:${channel}`
      const duplicate = existing.find((record) => record.idempotencyKey === key)
      if (duplicate) {
        created.push(duplicate)
        continue
      }
      const now = new Date().toISOString()
      const base = {
        schemaVersion: 1 as const,
        id: `ntf_${randomUUID()}`,
        projectId,
        backlogItemId: input.backlogItemId,
        agentRequestId: input.agentRequestId,
        channel,
        event: input.event,
        status: "queued" as const,
        idempotencyKey: key,
        title: input.title,
        body: config.redaction.includeSummary
          ? redactOperationalText(input.body ?? "", config.redaction)
          : "",
        workbenchPath: input.workbenchPath,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        revision: "",
      }
      const record = notificationOutboxItemSchema.parse({
        ...base,
        revision: revisionFor(base),
      })
      await atomicWrite(path.join(root, `${record.id}.json`), record)
      created.push(record)
    }
    return created
  }

  async updateStatus(
    projectId: string,
    notificationId: string,
    action: "retry" | "cancel",
    expectedRevision: string,
  ): Promise<NotificationOutboxItem> {
    const target = await this.getRecordTarget(projectId, notificationId)
    const current = await this.readRecord(target)
    if (action === "retry" && current.status !== "failed") {
      throw new WorkspaceError("Somente entregas com falha podem ser reenfileiradas.", "CONFLICT")
    }
    if (action === "retry" && current.attempts >= MAX_ATTEMPTS) {
      throw new WorkspaceError("Limite de tentativas de entrega atingido.", "LIMIT_EXCEEDED")
    }
    if (action === "cancel" && !["queued", "failed"].includes(current.status)) {
      throw new WorkspaceError("Esta entrega não pode mais ser cancelada.", "CONFLICT")
    }
    const now = new Date().toISOString()
    return this.updateRecord(target, current, expectedRevision, {
      status: action === "cancel" ? "canceled" : "queued",
      nextAttemptAt: undefined,
      lastError: action === "retry" ? undefined : current.lastError,
      updatedAt: now,
    })
  }

  async claimForDelivery(
    projectId: string,
    notificationId: string,
    expectedRevision: string,
    now = new Date(),
  ): Promise<NotificationOutboxItem> {
    const target = await this.getRecordTarget(projectId, notificationId)
    const current = await this.readRecord(target)
    if (current.status !== "queued") {
      throw new WorkspaceError("A notificação não está disponível para entrega.", "CONFLICT")
    }
    if (current.nextAttemptAt && Date.parse(current.nextAttemptAt) > now.getTime()) {
      throw new WorkspaceError("A próxima tentativa ainda não está disponível.", "CONFLICT")
    }
    if (current.attempts >= MAX_ATTEMPTS) {
      throw new WorkspaceError("Limite de tentativas de entrega atingido.", "LIMIT_EXCEEDED")
    }
    return this.updateRecord(target, current, expectedRevision, {
      status: "delivering",
      attempts: current.attempts + 1,
      nextAttemptAt: undefined,
      lastError: undefined,
      updatedAt: now.toISOString(),
    })
  }

  async recordDeliverySuccess(
    projectId: string,
    notificationId: string,
    expectedRevision: string,
    receipt: NotificationDeliveryReceipt,
    now = new Date(),
  ): Promise<NotificationOutboxItem> {
    const target = await this.getRecordTarget(projectId, notificationId)
    const current = await this.readRecord(target)
    if (current.status !== "delivering") {
      throw new WorkspaceError("A notificação não possui entrega em andamento.", "CONFLICT")
    }
    const safeReceipt = notificationDeliveryReceiptSchema.parse(receipt)
    return this.updateRecord(target, current, expectedRevision, {
      status: "delivered",
      providerMessageId: safeReceipt.providerMessageId,
      providerUrl: safeReceipt.providerUrl,
      deliveredAt: now.toISOString(),
      nextAttemptAt: undefined,
      lastError: undefined,
      updatedAt: now.toISOString(),
    })
  }

  async recordDeliveryFailure(
    projectId: string,
    notificationId: string,
    expectedRevision: string,
    error: unknown,
    now = new Date(),
  ): Promise<NotificationOutboxItem> {
    const target = await this.getRecordTarget(projectId, notificationId)
    const current = await this.readRecord(target)
    if (current.status !== "delivering") {
      throw new WorkspaceError("A notificação não possui entrega em andamento.", "CONFLICT")
    }
    const rawMessage = error instanceof Error ? error.message : String(error)
    const lastError = redactSensitiveText(rawMessage).slice(0, 1_000)
    const exhausted = current.attempts >= MAX_ATTEMPTS
    const delayMs = Math.min(2 ** Math.max(0, current.attempts - 1) * 30_000, 3_600_000)
    return this.updateRecord(target, current, expectedRevision, {
      status: "failed",
      lastError: lastError || "Falha de entrega sem detalhes.",
      nextAttemptAt: exhausted
        ? undefined
        : new Date(now.getTime() + delayMs).toISOString(),
      updatedAt: now.toISOString(),
    })
  }

  async recoverStaleDeliveries(
    projectId: string,
    now = new Date(),
    staleAfterMs = 120_000,
  ): Promise<number> {
    const boundedStaleAfterMs = Math.min(Math.max(staleAfterMs, 60_000), 600_000)
    const cutoff = now.getTime() - boundedStaleAfterMs
    const stale = (await this.list(projectId)).filter((item) => (
      item.status === "delivering" && Date.parse(item.updatedAt) <= cutoff
    ))
    let recovered = 0
    for (const item of stale) {
      const target = await this.getRecordTarget(projectId, item.id)
      const current = await this.readRecord(target)
      if (current.status !== "delivering" || Date.parse(current.updatedAt) > cutoff) continue
      await this.updateRecord(target, current, current.revision, {
        status: "failed",
        lastError: "Entrega interrompida antes do recibo do provedor.",
        nextAttemptAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      recovered += 1
    }
    return recovered
  }
}
