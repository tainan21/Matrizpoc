import { randomUUID } from "node:crypto"
import { z } from "zod"
import { RevisionConflictError, WorkspaceError } from "./errors"

const isoDate = z.string().datetime()
const revisionSchema = z.string().trim().min(8).max(200)
const operationalIdSchema = z.string().regex(/^[a-z][a-z0-9.-]{1,79}$/)
const missionIdSchema = z.string().regex(/^mission_[0-9a-f-]{36}$/)
const evidenceIdSchema = z.string().regex(/^evidence_[0-9a-f-]{36}$/)
const handoffIdSchema = z.string().regex(/^handoff_[0-9a-f-]{36}$/)
const humanReviewerIdSchema = z.string().regex(
  /^human_[0-9a-f-]{36}$/,
  "O revisor precisa ser uma identidade humana verificável.",
)

export const authorityLevelSchema = z.enum([
  "observe",
  "propose",
  "change_scoped",
  "execute_approved",
])

export const missionStatusSchema = z.enum([
  "assigned",
  "in_progress",
  "in_review",
  "completed",
  "cancelled",
])

export const safeRelativePathSchema = z.string().min(1).max(500).superRefine((value, context) => {
  if (value !== value.trim() || value.includes("\\") || value.startsWith("/") || /^[a-zA-Z]:/.test(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "O path deve ser relativo e normalizado." })
    return
  }

  const segments = value.split("/")
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\0"))) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "O path não pode escapar do projeto." })
  }
})

export const agentProfileSchema = z.object({
  schemaVersion: z.literal(1),
  id: operationalIdSchema,
  displayName: z.string().trim().min(1).max(120),
  personaSummary: z.string().trim().min(1).max(500),
  missionStatement: z.string().trim().min(1).max(500),
  capabilityIds: z.array(operationalIdSchema).max(50),
  defaultAuthority: authorityLevelSchema,
  humanOwner: z.string().trim().min(1).max(120),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision: revisionSchema,
})

export const humanReviewerSchema = z.object({
  kind: z.literal("human"),
  id: humanReviewerIdSchema,
})

export const humanMissionReviewSchema = z.object({
  decision: z.enum(["approved", "changes_requested"]),
  reviewer: humanReviewerSchema,
  reviewedAt: isoDate,
  note: z.string().trim().min(1).max(1_000),
})

export const missionSchema = z.object({
  schemaVersion: z.literal(1),
  id: missionIdSchema,
  profileId: operationalIdSchema,
  projectId: operationalIdSchema,
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(2_000),
  allowedPaths: z.array(safeRelativePathSchema).min(1).max(100),
  authority: authorityLevelSchema,
  status: missionStatusSchema,
  contextReferences: z.array(z.string().trim().min(1).max(500)).max(100),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).max(100),
  evidenceIds: z.array(evidenceIdSchema).max(500),
  humanReview: humanMissionReviewSchema.optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  revision: revisionSchema,
}).superRefine((mission, context) => {
  if (mission.status !== "completed") return
  if (!mission.evidenceIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidenceIds"],
      message: "Uma missão concluída exige evidência revisável.",
    })
  }
  if (mission.humanReview?.decision !== "approved") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["humanReview"],
      message: "Uma missão concluída exige aprovação humana explícita.",
    })
  }
})

const evidenceBaseSchema = z.object({
  id: evidenceIdSchema,
  summary: z.string().trim().min(1).max(1_000),
  recordedBy: z.string().trim().min(1).max(120),
})

export const missionEvidenceInputSchema = z.discriminatedUnion("kind", [
  evidenceBaseSchema.extend({ kind: z.literal("file"), path: safeRelativePathSchema }),
  evidenceBaseSchema.extend({ kind: z.literal("test"), command: z.string().trim().min(1).max(1_000) }),
  evidenceBaseSchema.extend({
    kind: z.literal("url"),
    url: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  }),
  evidenceBaseSchema.extend({ kind: z.literal("note"), note: z.string().trim().min(1).max(2_000) }),
])

export const missionEvidenceSchema = missionEvidenceInputSchema.and(z.object({
  schemaVersion: z.literal(1),
  missionId: missionIdSchema,
  recordedAt: isoDate,
}))

export const missionHandoffInputSchema = z.object({
  id: handoffIdSchema,
  contextSummary: z.string().trim().min(1).max(2_000),
  decisions: z.array(z.string().trim().min(1).max(500)).max(100),
  risks: z.array(z.string().trim().min(1).max(500)).max(100),
  nextStep: z.string().trim().min(1).max(1_000),
  authoredBy: humanReviewerSchema,
})

export const missionHandoffSchema = missionHandoffInputSchema.extend({
  schemaVersion: z.literal(1),
  missionId: missionIdSchema,
  createdAt: isoDate,
})

const createMissionInputSchema = z.object({
  id: missionIdSchema,
  profileId: operationalIdSchema,
  projectId: operationalIdSchema,
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(2_000),
  allowedPaths: z.array(safeRelativePathSchema).min(1).max(100),
  authority: authorityLevelSchema,
  contextReferences: z.array(z.string().trim().min(1).max(500)).max(100),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).max(100),
})

const reviewMissionInputSchema = z.object({
  decision: z.enum(["approved", "changes_requested"]),
  reviewer: humanReviewerSchema,
  note: z.string().trim().min(1).max(1_000),
})

export type AuthorityLevel = z.infer<typeof authorityLevelSchema>
export type AgentProfile = z.infer<typeof agentProfileSchema>
export type Mission = z.infer<typeof missionSchema>
export type MissionEvidence = z.infer<typeof missionEvidenceSchema>
export type MissionHandoff = z.infer<typeof missionHandoffSchema>
export type CreateMissionInput = z.infer<typeof createMissionInputSchema>
export type MissionEvidenceInput = z.infer<typeof missionEvidenceInputSchema>
export type MissionHandoffInput = z.infer<typeof missionHandoffInputSchema>
export type ReviewMissionInput = z.infer<typeof reviewMissionInputSchema>

export interface AgentOperationDependencies {
  now?: () => string
  createRevision?: () => string
}

function now(dependencies: AgentOperationDependencies): string {
  return isoDate.parse(dependencies.now?.() ?? new Date().toISOString())
}

function createRevision(dependencies: AgentOperationDependencies): string {
  return revisionSchema.parse(dependencies.createRevision?.() ?? randomUUID())
}

function assertCurrentRevision(mission: Mission, expectedRevision: string): void {
  if (mission.revision !== expectedRevision) throw new RevisionConflictError()
}

function assertMutable(mission: Mission): void {
  if (mission.status === "completed" || mission.status === "cancelled") {
    throw new WorkspaceError("Uma missão terminal não pode receber novas alterações.", "CONFLICT")
  }
}

function isWithinAllowedPath(path: string, allowedPaths: readonly string[]): boolean {
  return allowedPaths.some((allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`))
}

const TRANSITIONS: Record<Exclude<Mission["status"], "completed" | "cancelled">, readonly Mission["status"][]> = {
  assigned: ["in_progress", "cancelled"],
  in_progress: ["in_review", "cancelled"],
  in_review: ["in_progress", "cancelled"],
}

export function canTransitionMission(from: Mission["status"], to: Mission["status"]): boolean {
  return TRANSITIONS[from as keyof typeof TRANSITIONS]?.includes(to) ?? false
}

export function createMission(
  input: CreateMissionInput,
  profiles: readonly AgentProfile[],
  dependencies: AgentOperationDependencies = {},
): Mission {
  const parsed = createMissionInputSchema.parse(input)
  if (!profiles.some((profile) => profile.id === parsed.profileId)) {
    throw new WorkspaceError("A missão exige um perfil de agente conhecido.", "NOT_FOUND")
  }
  const timestamp = now(dependencies)
  return missionSchema.parse({
    schemaVersion: 1,
    ...parsed,
    status: "assigned",
    evidenceIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: createRevision(dependencies),
  })
}

export function transitionMission(
  mission: Mission,
  target: Mission["status"],
  expectedRevision: string,
  dependencies: AgentOperationDependencies = {},
): Mission {
  const current = missionSchema.parse(mission)
  assertCurrentRevision(current, expectedRevision)
  assertMutable(current)
  if (!canTransitionMission(current.status, target)) {
    throw new WorkspaceError("A mudança de estado precisa seguir o fluxo estrito da missão.", "INVALID_DATA")
  }
  return missionSchema.parse({
    ...current,
    status: target,
    updatedAt: now(dependencies),
    revision: createRevision(dependencies),
  })
}

export function addEvidence(
  mission: Mission,
  input: MissionEvidenceInput,
  expectedRevision: string,
  dependencies: AgentOperationDependencies = {},
): { mission: Mission; evidence: MissionEvidence } {
  const current = missionSchema.parse(mission)
  assertCurrentRevision(current, expectedRevision)
  assertMutable(current)
  const evidenceInput = missionEvidenceInputSchema.parse(input)
  if (current.evidenceIds.includes(evidenceInput.id)) {
    throw new WorkspaceError("A evidência já está vinculada à missão.", "CONFLICT")
  }
  if (evidenceInput.kind === "file" && !isWithinAllowedPath(evidenceInput.path, current.allowedPaths)) {
    throw new WorkspaceError("A evidência de arquivo precisa permanecer no escopo autorizado da missão.", "INVALID_PATH")
  }
  const recordedAt = now(dependencies)
  const evidence = missionEvidenceSchema.parse({
    schemaVersion: 1,
    ...evidenceInput,
    missionId: current.id,
    recordedAt,
  })
  const nextMission = missionSchema.parse({
    ...current,
    evidenceIds: [...current.evidenceIds, evidence.id],
    updatedAt: recordedAt,
    revision: createRevision(dependencies),
  })
  return { mission: nextMission, evidence }
}

export function createMissionHandoff(
  mission: Mission,
  input: MissionHandoffInput,
  expectedRevision: string,
  dependencies: AgentOperationDependencies = {},
): MissionHandoff {
  const current = missionSchema.parse(mission)
  assertCurrentRevision(current, expectedRevision)
  assertMutable(current)
  const handoff = missionHandoffInputSchema.parse(input)
  return missionHandoffSchema.parse({
    schemaVersion: 1,
    ...handoff,
    missionId: current.id,
    createdAt: now(dependencies),
  })
}

export function reviewMission(
  mission: Mission,
  evidence: readonly MissionEvidence[],
  input: ReviewMissionInput,
  expectedRevision: string,
  dependencies: AgentOperationDependencies = {},
): Mission {
  const current = missionSchema.parse(mission)
  assertCurrentRevision(current, expectedRevision)
  if (current.status !== "in_review") {
    throw new WorkspaceError("A missão precisa estar em revisão humana.", "INVALID_DATA")
  }
  const review = reviewMissionInputSchema.parse(input)
  if (review.reviewer.id === current.profileId) {
    throw new WorkspaceError("A conclusão exige uma revisão humana distinta do agente.", "INVALID_DATA")
  }
  const attachedEvidence = evidence
    .map((item) => missionEvidenceSchema.parse(item))
    .filter((item) => item.missionId === current.id && current.evidenceIds.includes(item.id))
  if (review.decision === "approved" && !attachedEvidence.length) {
    throw new WorkspaceError("A conclusão exige ao menos uma evidência revisável.", "INVALID_DATA")
  }
  const reviewedAt = now(dependencies)
  return missionSchema.parse({
    ...current,
    status: review.decision === "approved" ? "completed" : "in_progress",
    humanReview: { ...review, reviewedAt },
    updatedAt: reviewedAt,
    revision: createRevision(dependencies),
  })
}
