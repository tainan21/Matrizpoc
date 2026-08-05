import { z } from "zod"
import {
  actorSchema,
  prioritySchema,
  workItemIdSchema,
  workItemKindSchema,
} from "./schemas"

const isoDate = z.string().datetime()
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const revision = z.string().min(8)
const projectId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)
const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9a-f-]{36}$`))

export const inboxOriginSchema = z.enum([
  "human",
  "codex_suggestion",
  "external_issue",
  "repository_change",
  "bug_report",
  "pending_decision",
  "documentation_drift",
  "uncatalogued_work",
])

export const inboxStatusSchema = z.enum(["untriaged", "triaged", "accepted", "discarded"])

export const inboxReferenceSchema = z.object({
  kind: z.enum(["repository_file", "external_url", "work_item", "document", "activity"]),
  value: z.string().trim().min(1).max(500),
  label: z.string().trim().min(1).max(120).optional(),
})

export const inboxRelationSuggestionSchema = z.object({
  kind: z.enum(["parent", "dependency", "duplicate", "related"]),
  projectId: projectId.optional(),
  workItemId: workItemIdSchema.optional(),
  inboxItemId: id("in").optional(),
  reason: z.string().trim().min(1).max(500),
})

export const inboxDecisionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("accepted"),
    projectId,
    workItemId: workItemIdSchema,
    actor: actorSchema,
    decidedAt: isoDate,
  }),
  z.object({
    kind: z.literal("discarded"),
    reason: z.string().trim().min(1).max(500),
    actor: actorSchema,
    decidedAt: isoDate,
  }),
])

export const inboxItemSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: id("in"),
    title: z.string().trim().min(1).max(180),
    detail: z.string().trim().max(8000).default(""),
    origin: inboxOriginSchema,
    originKey: z.string().trim().min(1).max(300).optional(),
    reason: z.string().trim().max(1000).default(""),
    confidence: z.number().min(0).max(1).optional(),
    references: z.array(inboxReferenceSchema).max(30).default([]),
    suggestedProjectId: projectId.optional(),
    suggestedKind: workItemKindSchema.optional(),
    suggestedDomain: z.string().trim().min(1).max(100).optional(),
    suggestedPriority: prioritySchema.optional(),
    suggestedRelations: z.array(inboxRelationSuggestionSchema).max(30).default([]),
    groupKey: z.string().trim().min(1).max(120).optional(),
    duplicateOf: id("in").optional(),
    status: inboxStatusSchema,
    decision: inboxDecisionSchema.optional(),
    createdAt: isoDate,
    updatedAt: isoDate,
    revision,
  })
  .superRefine((item, context) => {
    if (item.status === "accepted" && item.decision?.kind !== "accepted") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["decision"], message: "Uma entrada aceita precisa registrar o work item criado." })
    }
    if (item.status === "discarded" && item.decision?.kind !== "discarded") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["decision"], message: "Uma entrada descartada precisa registrar o motivo." })
    }
    if (["untriaged", "triaged"].includes(item.status) && item.decision) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["decision"], message: "Entradas abertas ainda não possuem decisão final." })
    }
  })

export const sprintStatusSchema = z.enum(["planning", "active", "validation", "completed", "cancelled"])
export const sprintExecutionModeSchema = z.enum(["human", "codex", "agent", "paired"])
export const sprintOutcomeResultSchema = z.enum(["validated", "partial", "not_met", "dropped", "carried_over"])

export const sprintOutcomeRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("work_item_outcome"), projectId, workItemId: workItemIdSchema }),
  z.object({ kind: z.literal("roadmap_initiative"), projectId, initiativeId: id("ini") }),
])

export const sprintOutcomeCommitmentSchema = z.object({
  id: id("commit"),
  ref: sprintOutcomeRefSchema,
  title: z.string().trim().min(1).max(180),
  result: sprintOutcomeResultSchema.optional(),
  resultSummary: z.string().trim().max(2000).default(""),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
})

export const sprintWorkRefSchema = z.object({
  projectId,
  workItemId: workItemIdSchema,
  outcomeCommitmentId: id("commit"),
  executionMode: sprintExecutionModeSchema,
  addedAt: isoDate,
})

export const crossProjectDependencySchema = z.object({
  fromProjectId: projectId,
  fromWorkItemId: workItemIdSchema,
  toProjectId: projectId,
  toWorkItemId: workItemIdSchema,
  summary: z.string().trim().min(1).max(500),
})

export const sprintClosureSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
  memoryDocumentRef: z.string().trim().min(1).max(500),
  nextSprintId: id("spr").optional(),
  closedBy: actorSchema,
  closedAt: isoDate,
})

export const sprintSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: id("spr"),
    name: z.string().trim().min(1).max(120),
    intent: z.string().trim().min(1).max(1000),
    startDate: calendarDate,
    endDate: calendarDate,
    status: sprintStatusSchema,
    wipLimit: z.number().int().min(1).max(100).default(4),
    wipOverrideReason: z.string().trim().min(1).max(500).optional(),
    confidence: z.number().int().min(1).max(5).optional(),
    confidenceRationale: z.string().trim().max(1000).default(""),
    risks: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
    outcomes: z.array(sprintOutcomeCommitmentSchema).max(30).default([]),
    work: z.array(sprintWorkRefSchema).max(300).default([]),
    crossProjectDependencies: z.array(crossProjectDependencySchema).max(100).default([]),
    closure: sprintClosureSchema.optional(),
    createdAt: isoDate,
    updatedAt: isoDate,
    revision,
  })
  .superRefine((sprint, context) => {
    if (sprint.endDate < sprint.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "O fim da sprint deve ser igual ou posterior ao início." })
    }
    const commitmentIds = new Set(sprint.outcomes.map((outcome) => outcome.id))
    for (const [index, item] of sprint.work.entries()) {
      if (!commitmentIds.has(item.outcomeCommitmentId)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["work", index, "outcomeCommitmentId"], message: "O trabalho precisa apontar para um outcome comprometido." })
      }
    }
    if (sprint.status === "completed") {
      if (!sprint.closure) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["closure"], message: "Uma sprint concluída exige memória final." })
      }
      if (sprint.outcomes.some((outcome) => !outcome.result)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes"], message: "Todos os outcomes precisam de uma decisão antes do encerramento." })
      }
      if (sprint.outcomes.some((outcome) => outcome.result === "carried_over") && !sprint.closure?.nextSprintId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["closure", "nextSprintId"], message: "Carry-over exige vínculo explícito com a sprint seguinte." })
      }
    }
  })

export type InboxItem = z.infer<typeof inboxItemSchema>
export type InboxOrigin = z.infer<typeof inboxOriginSchema>
export type InboxStatus = z.infer<typeof inboxStatusSchema>
export type Sprint = z.infer<typeof sprintSchema>
export type SprintStatus = z.infer<typeof sprintStatusSchema>
export type SprintOutcomeCommitment = z.infer<typeof sprintOutcomeCommitmentSchema>
export type SprintOutcomeRef = z.infer<typeof sprintOutcomeRefSchema>
export type SprintWorkRef = z.infer<typeof sprintWorkRefSchema>
