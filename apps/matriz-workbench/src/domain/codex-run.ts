import { z } from "zod"
import { workItemIdSchema } from "./schemas"

const isoDate = z.string().datetime()
const requestId = z.string().regex(/^req_[0-9a-f-]{36}$/)

export const codexRunStatusSchema = z.enum([
  "starting",
  "running",
  "waiting_approval",
  "completed",
  "failed",
  "interrupted",
])

export const codexApprovalSchema = z.object({
  id: z.string().regex(/^apr_[0-9a-f-]{36}$/),
  kind: z.enum(["command", "file_change"]),
  status: z.enum(["pending", "accepted", "accepted_for_session", "declined", "cancelled"]),
  title: z.string().trim().min(1).max(500),
  detail: z.string().max(4_000).default(""),
  createdAt: isoDate,
  resolvedAt: isoDate.optional(),
})

export const codexCommandSchema = z.object({
  id: z.string().trim().min(1).max(200),
  command: z.string().trim().min(1).max(2_000),
  cwd: z.string().max(500).default(""),
  status: z.enum(["in_progress", "completed", "failed", "declined"]),
  exitCode: z.number().int().nullable().default(null),
  output: z.string().max(4_000).default(""),
})

export const codexPlanStepSchema = z.object({
  step: z.string().trim().min(1).max(500),
  status: z.enum(["pending", "in_progress", "completed"]),
})

export const codexRunRecordSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  requestId,
  backlogItemId: workItemIdSchema,
  status: codexRunStatusSchema,
  threadId: z.string().trim().min(1).max(200).optional(),
  turnId: z.string().trim().min(1).max(200).optional(),
  latestMessage: z.string().max(8_000).default(""),
  plan: z.array(codexPlanStepSchema).max(50).default([]),
  commands: z.array(codexCommandSchema).max(50).default([]),
  changedFiles: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  checks: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  approvals: z.array(codexApprovalSchema).max(50).default([]),
  diff: z.string().max(120_000).default(""),
  error: z.string().max(4_000).optional(),
  startedAt: isoDate,
  updatedAt: isoDate,
  completedAt: isoDate.optional(),
  revision: z.string().min(8),
})

export type CodexRunRecord = z.infer<typeof codexRunRecordSchema>
export type CodexApproval = z.infer<typeof codexApprovalSchema>
export type CodexRunStatus = z.infer<typeof codexRunStatusSchema>

export interface CodexRunSnapshot extends CodexRunRecord {
  connected: boolean
}
