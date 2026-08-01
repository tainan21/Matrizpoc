import { z } from "zod"

function isSafeProviderUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

export const notificationChannelSchema = z.enum(["slack", "teams"])
export const notificationEventSchema = z.enum([
  "blocked",
  "completed",
  "review_ready",
  "preview_ready",
])
export const notificationStatusSchema = z.enum([
  "queued",
  "delivering",
  "delivered",
  "failed",
  "canceled",
])

export const notificationConfigSchema = z.object({
  schemaVersion: z.literal(1),
  enabled: z.boolean(),
  channels: z.array(notificationChannelSchema).max(2),
  events: z.array(notificationEventSchema).max(4),
  redaction: z.object({
    includeSummary: z.boolean(),
    includeFilePaths: z.boolean(),
    includeExternalUrls: z.boolean(),
  }),
  updatedAt: z.string().datetime(),
  revision: z.string().min(1),
})

export const notificationOutboxItemSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^ntf_[0-9a-f-]{36}$/),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  backlogItemId: z.string().regex(/^tsk_[0-9a-f-]{36}$/).optional(),
  agentRequestId: z.string().regex(/^req_[0-9a-f-]{36}$/).optional(),
  channel: notificationChannelSchema,
  event: notificationEventSchema,
  status: notificationStatusSchema,
  idempotencyKey: z.string().min(1).max(240),
  title: z.string().min(1).max(240),
  body: z.string().max(2_000),
  workbenchPath: z.string().regex(/^\/projects\/[a-z0-9][a-z0-9-]*(?:\/[A-Za-z0-9_./-]+)?$/),
  attempts: z.number().int().min(0).max(20),
  nextAttemptAt: z.string().datetime().optional(),
  lastError: z.string().max(1_000).optional(),
  providerMessageId: z.string().max(240).optional(),
  providerUrl: z.string().url().max(2_000).refine(
    isSafeProviderUrl,
    "A URL do provedor deve usar HTTPS e não pode conter credenciais.",
  ).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deliveredAt: z.string().datetime().optional(),
  revision: z.string().min(1),
})

export type NotificationChannel = z.infer<typeof notificationChannelSchema>
export type NotificationEvent = z.infer<typeof notificationEventSchema>
export type NotificationConfig = z.infer<typeof notificationConfigSchema>
export type NotificationOutboxItem = z.infer<typeof notificationOutboxItemSchema>

export const notificationDeliveryReceiptSchema = z.object({
  providerMessageId: z.string().max(240).optional(),
  providerUrl: z.string().url().max(2_000).refine(
    isSafeProviderUrl,
    "A URL do provedor deve usar HTTPS e não pode conter credenciais.",
  ).optional(),
})

export type NotificationDeliveryReceipt = z.infer<typeof notificationDeliveryReceiptSchema>

export interface NotificationProvider {
  readonly channel: NotificationChannel
  deliver(item: NotificationOutboxItem): Promise<NotificationDeliveryReceipt>
}
