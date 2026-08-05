import { z } from "zod"

const isoDate = z.string().datetime()
const revision = z.string().min(8)
const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9a-f-]{36}$`))

export const controlEvidenceSourceSchema = z.enum(["deterministic", "codex", "mcp", "ai", "human", "external"])
export const evidenceStatusSchema = z.enum(["proposed", "approved", "rejected"])
export const controlEntityKindSchema = z.enum(["human", "codex", "mcp", "agent", "system"])
export const controlNotificationSeveritySchema = z.enum(["info", "success", "warning", "danger"])

export const evidenceProposalSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("evp"),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  scorecardSlug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  goalId: z.string().min(1).max(100),
  claim: z.string().trim().min(1).max(1000),
  references: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  source: controlEvidenceSourceSchema,
  status: evidenceStatusSchema,
  reviewedBy: z.string().trim().min(1).max(100).optional(),
  reviewedAt: isoDate.optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision,
})

export const controlApprovalSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("apr"),
  projectId: z.string(),
  evidenceId: id("evp"),
  decision: z.enum(["approved", "rejected"]),
  actor: z.enum(["human", "codex", "mcp", "agent", "system"]),
  note: z.string().trim().max(500).default(""),
  createdAt: isoDate,
})

export const controlEntitySchema = z.object({
  schemaVersion: z.literal(1),
  id: id("ent"),
  projectId: z.string(),
  kind: controlEntityKindSchema,
  label: z.string().trim().min(1).max(100),
  status: z.enum(["active", "idle", "offline"]),
  lastSeenAt: isoDate,
  metadata: z.record(z.string().max(300)).default({}),
  revision,
})

export const controlNotificationSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("ntf"),
  projectId: z.string(),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().max(1000).default(""),
  severity: controlNotificationSeveritySchema,
  dedupeKey: z.string().trim().min(1).max(180),
  read: z.boolean().default(false),
  createdAt: isoDate,
})

export const backlogInsightSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("ins"),
  projectId: z.string(),
  backlogItemId: z.string(),
  kind: z.enum(["blocked", "missing_context", "stale", "dependency"]),
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(500),
  priority: z.enum(["critical", "high", "medium", "low"]),
  createdAt: isoDate,
})

export const snippetSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("snp"),
  projectId: z.string(),
  command: z.string().regex(/^\/[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(12000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  updatedAt: isoDate,
  revision,
})

export const scorePolicySchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string(),
  weights: z.object({ app: z.number().min(0).max(1), docs: z.number().min(0).max(1), "features-domains": z.number().min(0).max(1) }),
  updatedAt: isoDate,
  revision,
}).superRefine((value, context) => {
  if (Math.abs(value.weights.app + value.weights.docs + value.weights["features-domains"] - 1) > 0.0001) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Pesos devem somar 1.", path: ["weights"] })
  }
})

export const scoreTrackSummarySchema = z.object({
  slug: z.string(), title: z.string(), score: z.number().int().min(0).max(100), approved: z.number().int().min(0), pending: z.number().int().min(0), total: z.literal(100),
})

export const scoreSummarySchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string(),
  aggregate: z.number().int().min(0).max(100),
  tracks: z.array(scoreTrackSummarySchema).length(3),
  updatedAt: isoDate,
  revision,
})

export type EvidenceProposal = z.infer<typeof evidenceProposalSchema>
export type ControlApproval = z.infer<typeof controlApprovalSchema>
export type ControlEntity = z.infer<typeof controlEntitySchema>
export type ControlNotification = z.infer<typeof controlNotificationSchema>
export type BacklogInsight = z.infer<typeof backlogInsightSchema>
export type Snippet = z.infer<typeof snippetSchema>
export type ScorePolicy = z.infer<typeof scorePolicySchema>
export type ScoreSummary = z.infer<typeof scoreSummarySchema>
