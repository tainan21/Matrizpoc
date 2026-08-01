import { z } from "zod"

const isoDate = z.string().datetime()
const revision = z.string().min(8)
const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9a-f-]{36}$`))

export const backlogStatusSchema = z.enum([
  "idea",
  "ready",
  "in_progress",
  "blocked",
  "review",
  "done",
  "archived",
])
export const workItemIdSchema = z.string().regex(/^(?:tsk|wi)_[0-9a-f-]{36}$/)
export const workItemKindSchema = z.enum(["outcome", "feature", "task", "bug"])
export const productStatusSchema = z.enum([
  "discovery",
  "refined",
  "ready",
  "in_progress",
  "validation",
  "completed",
  "archived",
])
export const validationStatusSchema = z.enum([
  "not_required",
  "pending",
  "running",
  "passed",
  "failed",
  "waived",
])
export const humanReviewStatusSchema = z.enum([
  "not_required",
  "pending",
  "approved",
  "changes_requested",
])
export const documentationStatusSchema = z.enum([
  "not_required",
  "pending",
  "current",
  "stale",
])
export const roadmapStatusSchema = z.enum(["planned", "active", "paused", "completed"])
export const roadmapGoalCategorySchema = z.enum([
  "vision",
  "product",
  "architecture",
  "design",
  "experience",
  "quality",
  "security",
  "performance",
  "collaboration",
  "scale",
])
export const agentRequestStatusSchema = z.enum([
  "queued",
  "claimed",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
])
export const prioritySchema = z.enum(["critical", "high", "medium", "low"])
export const actorSchema = z.enum(["human", "codex", "agent", "system"])
export const backlogWorkScopeSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("project") }),
    z.object({
      kind: z.literal("site"),
      id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    }),
  ])
  .default({ kind: "project" })

export const acceptanceCriterionSchema = z.object({
  id: id("ac"),
  text: z.string().trim().min(1).max(500),
  completed: z.boolean(),
})

export const attachmentReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("repository_file"),
    path: z.string().trim().min(1).max(500),
    label: z.string().trim().min(1).max(120).optional(),
  }),
  z.object({
    kind: z.literal("external_url"),
    url: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
    label: z.string().trim().min(1).max(120).optional(),
  }),
  z.object({
    kind: z.literal("workbench_document"),
    documentId: id("doc"),
    label: z.string().trim().min(1).max(120).optional(),
  }),
])

export const projectWorkspaceSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  displayName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision,
})

export const roadmapInitiativeSchema = z.object({
  id: id("ini"),
  title: z.string().trim().min(1).max(160),
  outcome: z.string().trim().max(500).default(""),
  status: roadmapStatusSchema,
  backlogIds: z.array(id("tsk")).default([]),
})

export const roadmapPhaseSchema = z.object({
  id: id("phase"),
  title: z.string().trim().min(1).max(120),
  outcome: z.string().trim().max(500).default(""),
  status: roadmapStatusSchema,
  initiatives: z.array(roadmapInitiativeSchema).default([]),
})

export const roadmapGoalSchema = z.object({
  id: id("goal"),
  ordinal: z.number().int().min(1).max(100),
  title: z.string().trim().min(1).max(180),
  outcome: z.string().trim().max(500).default(""),
  category: roadmapGoalCategorySchema,
  score: z.union([z.literal(0), z.literal(1)]),
  evidence: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
})

export const roadmapScorecardScopeSchema = z.enum([
  "workbench_app",
  "workbench_docs",
  "workbench_features",
  "ecosystem_docs",
  "custom",
])

export const roadmapScorecardSchema = z
  .object({
    id: id("scorecard"),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(""),
    scope: roadmapScorecardScopeSchema,
    goals: z.array(roadmapGoalSchema).length(100),
  })
  .superRefine((scorecard, context) => {
    const ordinals = new Set<number>()
    for (const goal of scorecard.goals) {
      if (ordinals.has(goal.ordinal)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A meta ${goal.ordinal} está duplicada na trilha ${scorecard.slug}.`,
          path: ["goals"],
        })
      }
      ordinals.add(goal.ordinal)
    }
  })

export const roadmapSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    phases: z.array(roadmapPhaseSchema).default([]),
    goals: z.array(roadmapGoalSchema).max(100).default([]),
    scorecards: z.array(roadmapScorecardSchema).max(12).default([]),
    updatedAt: isoDate,
    revision,
  })
  .superRefine((roadmap, context) => {
    const ordinals = new Set<number>()
    for (const goal of roadmap.goals) {
      if (ordinals.has(goal.ordinal)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A meta ${goal.ordinal} está duplicada.`,
          path: ["goals"],
        })
      }
      ordinals.add(goal.ordinal)
    }
    const scorecardSlugs = new Set<string>()
    for (const scorecard of roadmap.scorecards) {
      if (scorecardSlugs.has(scorecard.slug)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A trilha ${scorecard.slug} está duplicada.`,
          path: ["scorecards"],
        })
      }
      scorecardSlugs.add(scorecard.slug)
    }
  })

export const backlogItemSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("tsk"),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(8000).default(""),
  status: backlogStatusSchema,
  priority: prioritySchema,
  workScope: backlogWorkScopeSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).max(30).default([]),
  dependencyIds: z.array(id("tsk")).max(30).default([]),
  references: z.array(attachmentReferenceSchema).max(30).default([]),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision,
})

export const workItemBlockerSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  status: z.enum(["open", "resolved"]),
  updatedAt: isoDate,
})

export const workItemV2Schema = z.object({
  schemaVersion: z.literal(2),
  id: workItemIdSchema,
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  kind: workItemKindSchema,
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(8000).default(""),
  productStatus: productStatusSchema,
  validationStatus: validationStatusSchema,
  humanReviewStatus: humanReviewStatusSchema,
  documentationStatus: documentationStatusSchema,
  priority: prioritySchema,
  domain: z.string().trim().min(1).max(100).optional(),
  responsible: z.string().trim().min(1).max(100).optional(),
  workScope: backlogWorkScopeSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).max(30).default([]),
  dependencyIds: z.array(workItemIdSchema).max(30).default([]),
  references: z.array(attachmentReferenceSchema).max(30).default([]),
  blocker: workItemBlockerSchema.optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision,
})

export const persistedWorkItemSchema = z.union([backlogItemSchema, workItemV2Schema])

export const agentRequestSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("req"),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  backlogItemId: workItemIdSchema,
  title: z.string().trim().min(1).max(180),
  instructions: z.string().trim().max(8000).default(""),
  status: agentRequestStatusSchema,
  claimedBy: z.string().trim().min(1).max(100).optional(),
  resultSummary: z.string().trim().max(8000).optional(),
  changedFiles: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  checks: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision,
})

export const activityEventSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("evt"),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  actor: actorSchema,
  action: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(1000),
  entityType: z.enum(["project", "roadmap", "backlog", "document", "agent_request"]),
  entityId: z.string().trim().min(1).max(100),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  occurredAt: isoDate,
})

export const contextPolicySchema = z.object({
  schemaVersion: z.literal(1),
  defaultBudgetChars: z.number().int().min(1000).max(40000).default(12000),
  absoluteBudgetChars: z.literal(40000),
  includeAgentInstructions: z.boolean().default(true),
  preferredDocs: z.array(z.string().max(300)).max(30).default([]),
  updatedAt: isoDate,
  revision,
})

export const workbenchDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: id("doc"),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  kind: z.enum(["product", "technical", "decision"]),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(180),
  content: z.string().max(100_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision,
})

export type ProjectWorkspace = z.infer<typeof projectWorkspaceSchema>
export type Roadmap = z.infer<typeof roadmapSchema>
export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>
export type RoadmapInitiative = z.infer<typeof roadmapInitiativeSchema>
export type RoadmapGoal = z.infer<typeof roadmapGoalSchema>
export type RoadmapGoalCategory = z.infer<typeof roadmapGoalCategorySchema>
export type RoadmapScorecard = z.infer<typeof roadmapScorecardSchema>
export type RoadmapScorecardScope = z.infer<typeof roadmapScorecardScopeSchema>
export type BacklogItem = z.infer<typeof backlogItemSchema>
export type WorkItem = z.infer<typeof workItemV2Schema>
export type PersistedWorkItem = z.infer<typeof persistedWorkItemSchema>
export type WorkItemKind = z.infer<typeof workItemKindSchema>
export type ProductStatus = z.infer<typeof productStatusSchema>
export type ValidationStatus = z.infer<typeof validationStatusSchema>
export type HumanReviewStatus = z.infer<typeof humanReviewStatusSchema>
export type DocumentationStatus = z.infer<typeof documentationStatusSchema>
export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>
export type AttachmentReference = z.infer<typeof attachmentReferenceSchema>
export type AgentRequest = z.infer<typeof agentRequestSchema>
export type ActivityEvent = z.infer<typeof activityEventSchema>
export type ContextPolicy = z.infer<typeof contextPolicySchema>
export type WorkbenchDocument = z.infer<typeof workbenchDocumentSchema>
export type BacklogStatus = z.infer<typeof backlogStatusSchema>
export type Priority = z.infer<typeof prioritySchema>
export type BacklogWorkScope = z.infer<typeof backlogWorkScopeSchema>
