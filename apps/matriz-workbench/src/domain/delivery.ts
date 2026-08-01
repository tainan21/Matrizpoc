import { z } from "zod"

const isoDate = z.string().datetime()

export const deliveryReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  backlogItemId: z.string().regex(/^tsk_[0-9a-f-]{36}$/),
  provider: z.literal("github"),
  kind: z.literal("issue"),
  idempotencyKey: z.string().trim().min(1).max(300),
  externalId: z.string().regex(/^[1-9][0-9]*$/),
  url: z.string().url().max(2_000),
  publishedAt: isoDate,
  recordedAt: isoDate,
  revision: z.string().min(8),
})

export type DeliveryReceipt = z.infer<typeof deliveryReceiptSchema>

export const pullRequestReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  backlogItemId: z.string().regex(/^tsk_[0-9a-f-]{36}$/),
  agentRequestId: z.string().regex(/^req_[0-9a-f-]{36}$/),
  provider: z.literal("github"),
  kind: z.literal("pull_request"),
  idempotencyKey: z.string().trim().min(1).max(300),
  externalId: z.string().regex(/^[1-9][0-9]*$/),
  url: z.string().url().max(2_000),
  baseBranch: z.string().trim().min(1).max(200),
  headBranch: z.string().trim().min(1).max(200),
  headCommit: z.string().regex(/^[0-9a-f]{40}$/),
  checks: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  publishedAt: isoDate,
  recordedAt: isoDate,
  revision: z.string().min(8),
})

export const previewReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  backlogItemId: z.string().regex(/^tsk_[0-9a-f-]{36}$/),
  agentRequestId: z.string().regex(/^req_[0-9a-f-]{36}$/),
  provider: z.literal("vercel"),
  kind: z.literal("preview"),
  idempotencyKey: z.string().trim().min(1).max(300),
  deploymentId: z.string().trim().min(1).max(300),
  url: z.string().url().max(2_000),
  environment: z.enum(["preview", "production"]),
  sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
  state: z.enum(["queued", "building", "ready", "error", "canceled"]),
  recordedAt: isoDate,
  revision: z.string().min(8),
})

export const deliveryArtifactReceiptSchema = z.discriminatedUnion("kind", [
  deliveryReceiptSchema,
  pullRequestReceiptSchema,
  previewReceiptSchema,
])

export type PullRequestReceipt = z.infer<typeof pullRequestReceiptSchema>
export type PreviewReceipt = z.infer<typeof previewReceiptSchema>
export type DeliveryArtifactReceipt = z.infer<typeof deliveryArtifactReceiptSchema>
