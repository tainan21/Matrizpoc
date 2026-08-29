"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { randomUUID } from "node:crypto"
import {
  attachmentReferenceSchema,
  backlogWorkScopeSchema,
  backlogStatusSchema,
  documentationStatusSchema,
  humanReviewStatusSchema,
  prioritySchema,
  productStatusSchema,
  roadmapStatusSchema,
  roadmapGateStatusSchema,
  roadmapMarkerKindSchema,
  roadmapMarkerSchema,
  roadmapOutcomeMarkerStatusSchema,
  validationStatusSchema,
  workItemIdSchema,
  workItemKindSchema,
  type RoadmapPhase,
  type AttachmentReference,
  type WorkbenchDocument,
} from "../src/domain/schemas"
import { assertRoadmapMarkerStatusChange, markerHasReviewableEvidence } from "../src/domain/roadmap-marker"
import { RevisionConflictError, WorkspaceError } from "../src/domain/errors"
import { WorkspaceRepository } from "../src/integration/filesystem/workspace-repository"
import { createMaturityGoalCatalog } from "../src/application/maturity-goal-catalog"
import { auditWorkbenchMaturity } from "../src/application/maturity-evidence-audit"
import {
  createScorecard,
  definitionsForProject,
} from "../src/application/scorecard-catalog"
import { enqueueOptionalNotifications } from "../src/application/collaboration/notification-service"
import {
  SESSION_COOKIE,
  isUnlocked,
  sessionDigest,
  tokenMatches,
} from "../src/auth/session"
import { getLocalRateLimiter } from "../src/auth/local-rate-limiter"
import { resolveWorkbenchRuntimeMode } from "../src/auth/runtime-mode"
import { projectBlueprintInputSchema } from "../src/domain/project-blueprints"
import { createProjectBlueprintWorkflow } from "../src/application/project-blueprints"
import { ProjectBlueprintRepository } from "../src/integration/filesystem/project-blueprint-repository"
import { snippetSchema } from "../src/domain/control"
import { buildScoreSummary } from "../src/application/control"
import {
  inboxOriginSchema,
  sprintExecutionModeSchema,
  sprintOutcomeResultSchema,
  sprintStatusSchema,
} from "../src/domain/adaptive-work"
import { AgentTeamService } from "../src/application/agent-team-service"
import { parseAgentTeamForm } from "../src/application/agent-team-form"
import type { MissionEvidenceInput } from "../src/domain/agent-operations"

function required(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== "string" || !value.trim()) throw new Error(`Campo obrigatório: ${key}`)
  return value.trim()
}

function lines(value: FormDataEntryValue | null): string[] {
  return typeof value === "string"
    ? value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

export type WorkItemMutationResult =
  | { status: "success"; itemId: string; revision: string; message: string }
  | { status: "conflict"; itemId: string; latestRevision: string; message: string }
  | { status: "error"; message: string }

export type RoadmapMutationResult =
  | { status: "success"; entityId: string; revision: string; message: string }
  | { status: "conflict"; entityId: string; latestRevision: string; message: string }
  | { status: "error"; message: string }

export type AgentExecutionReviewResult =
  | { status: "success"; requestId: string; revision: string; message: string }
  | { status: "conflict"; requestId: string; latestRevision: string; message: string }
  | { status: "error"; message: string }

async function roadmapFailure(
  repository: WorkspaceRepository,
  projectId: string,
  entityId: string,
  error: unknown,
): Promise<RoadmapMutationResult> {
  if (error instanceof RevisionConflictError) {
    const latest = await repository.getRoadmap(projectId).catch(() => undefined)
    return {
      status: "conflict",
      entityId,
      latestRevision: latest?.revision ?? "unknown",
      message: "O roadmap foi alterado em outra aba. Recarregue os dados antes de salvar novamente.",
    }
  }
  return {
    status: "error",
    message: error instanceof WorkspaceError || error instanceof Error
      ? error.message
      : "Não foi possível atualizar o roadmap.",
  }
}

function roadmapBacklogIds(value: FormDataEntryValue | null): string[] {
  const ids = typeof value === "string"
    ? value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
    : []
  return Array.from(new Set(ids.map((item) => workItemIdSchema.parse(item))))
}

function optionalAttachmentReference(formData: FormData): AttachmentReference | undefined {
  const kind = String(formData.get("referenceKind") ?? "").trim()
  const value = String(formData.get("referenceValue") ?? "").trim()
  if (!kind || !value) return undefined
  const label = String(formData.get("referenceLabel") ?? "").trim() || undefined
  return attachmentReferenceSchema.parse(
    kind === "repository_file" ? { kind, path: value, label }
      : kind === "external_url" ? { kind, url: value, label }
        : { kind, documentId: value, label },
  )
}

async function workItemFailure(
  repository: WorkspaceRepository,
  projectId: string,
  itemId: string,
  error: unknown,
): Promise<WorkItemMutationResult> {
  if (error instanceof RevisionConflictError) {
    const latest = await repository.getWorkItem(projectId, itemId).catch(() => undefined)
    return {
      status: "conflict",
      itemId,
      latestRevision: latest?.revision ?? "unknown",
      message: error.message,
    }
  }
  return {
    status: "error",
    message: error instanceof WorkspaceError || error instanceof Error
      ? error.message
      : "Não foi possível atualizar o work item.",
  }
}

async function requireWorkbenchSession(): Promise<void> {
  if (!(await isUnlocked())) redirect("/unlock")
}

export async function unlockAction(formData: FormData) {
  const limiter = getLocalRateLimiter()
  const decision = limiter.consume("unlock", { limit: 8, windowMs: 5 * 60_000 })
  if (!decision.allowed) redirect("/unlock?error=rate-limited")
  const token = required(formData, "token")
  if (!tokenMatches(token)) redirect("/unlock?error=invalid")
  limiter.reset("unlock")
  ;(await cookies()).set(SESSION_COOKIE, sessionDigest(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.WORKBENCH_COOKIE_SECURE === "true",
    path: "/",
  })
  redirect("/")
}

export async function lockAction() {
  await requireWorkbenchSession()
  if (resolveWorkbenchRuntimeMode() === "native-desktop") redirect("/")
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect("/unlock")
}

export async function initializeProjectAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  await repository.initializeProject(projectId)
  revalidatePath("/", "layout")
  redirect(`/projects/${projectId}`)
}

export async function createProjectBlueprintAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const blueprints = await ProjectBlueprintRepository.create(
    repository.repositoryRoot,
  )
  const commaSeparated = (key: string) =>
    String(formData.get(key) ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  const input = projectBlueprintInputSchema.parse({
    mode: formData.get("mode") ?? "create",
    name: required(formData, "name"),
    projectKind: required(formData, "projectKind"),
    target: required(formData, "target"),
    platforms: commaSeparated("platforms"),
    ownedDomains: commaSeparated("ownedDomains"),
    consumedCapabilities: commaSeparated("consumedCapabilities"),
    sharedCandidates: commaSeparated("sharedCandidates"),
    templateId: required(formData, "templateId"),
    validationCommands: lines(formData.get("validationCommands")),
  })
  const result = await createProjectBlueprintWorkflow(
    repository,
    blueprints,
    input,
  )
  revalidatePath("/", "layout")
  redirect(`/projects/matriz-infra-hub/backlog/${result.backlog.id}`)
}

export async function createWorkItemAction(formData: FormData): Promise<WorkItemMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  try {
    const kind = workItemKindSchema.parse(formData.get("kind") ?? "task")
    const item = await repository.createWorkItem(projectId, {
      kind,
      title: required(formData, "title"),
      description: String(formData.get("description") ?? "").trim(),
      productStatus: "discovery",
      validationStatus: kind === "task" ? "not_required" : "pending",
      humanReviewStatus: "not_required",
      documentationStatus: kind === "outcome" ? "pending" : "not_required",
      priority: prioritySchema.parse(formData.get("priority") ?? "medium"),
      domain: String(formData.get("domain") ?? "").trim() || undefined,
      responsible: String(formData.get("responsible") ?? "").trim() || undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      acceptanceCriteria: lines(formData.get("acceptanceCriteria")),
    })
    revalidatePath(`/projects/${projectId}`, "layout")
    return { status: "success", itemId: item.id, revision: item.revision, message: "Work item criado." }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Não foi possível criar o work item." }
  }
}

export async function saveWorkItemAction(formData: FormData): Promise<WorkItemMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const itemId = required(formData, "itemId")
  const repository = await WorkspaceRepository.create()
  try {
    const current = await repository.getWorkItem(projectId, itemId)
    const blockerSummary = String(formData.get("blockerSummary") ?? "").trim()
    const productStatus = productStatusSchema.parse(formData.get("productStatus"))
    const archiveReason = String(formData.get("archiveReason") ?? "").trim()
    const criterionTexts = lines(formData.get("acceptanceCriteria"))
    const item = await repository.updateWorkItem(
      projectId,
      itemId,
      {
        kind: workItemKindSchema.parse(formData.get("kind")),
        title: required(formData, "title"),
        description: String(formData.get("description") ?? "").trim(),
        productStatus,
        validationStatus: validationStatusSchema.parse(formData.get("validationStatus")),
        humanReviewStatus: humanReviewStatusSchema.parse(formData.get("humanReviewStatus")),
        documentationStatus: documentationStatusSchema.parse(formData.get("documentationStatus")),
        priority: prioritySchema.parse(formData.get("priority")),
        domain: String(formData.get("domain") ?? "").trim() || undefined,
        responsible: String(formData.get("responsible") ?? "").trim() || undefined,
        parentId: String(formData.get("parentId") ?? "").trim() || null,
        archive: productStatus === "archived"
          ? {
              reason: archiveReason,
              actor: "human",
              archivedAt: new Date().toISOString(),
            }
          : current.archive,
        tags: String(formData.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        dependencyIds: String(formData.get("dependencyIds") ?? "")
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter(Boolean),
        acceptanceCriteria: criterionTexts.map((text, index) => {
          const currentCriterion = current.acceptanceCriteria[index]
          return {
            id: currentCriterion?.id ?? `ac_${crypto.randomUUID()}`,
            text,
            completed: currentCriterion
              ? formData.get(`criterion:${currentCriterion.id}`) === "on"
              : false,
          }
        }),
        blocker: blockerSummary
          ? {
              summary: blockerSummary,
              status: formData.get("blockerStatus") === "resolved" ? "resolved" : "open",
              updatedAt: new Date().toISOString(),
            }
          : undefined,
      },
      required(formData, "revision"),
    )
    revalidatePath(`/projects/${projectId}`, "layout")
    return { status: "success", itemId: item.id, revision: item.revision, message: "Alterações salvas." }
  } catch (error) {
    return workItemFailure(repository, projectId, itemId, error)
  }
}

export async function moveWorkItemAction(
  projectId: string,
  itemId: string,
  targetStatus: string,
  revision: string,
): Promise<WorkItemMutationResult> {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  try {
    const item = await repository.updateWorkItem(
      projectId,
      itemId,
      { productStatus: productStatusSchema.parse(targetStatus) },
      revision,
    )
    revalidatePath(`/projects/${projectId}`, "layout")
    return { status: "success", itemId: item.id, revision: item.revision, message: "Estado atualizado." }
  } catch (error) {
    return workItemFailure(repository, projectId, itemId, error)
  }
}

export async function addWorkItemReferenceAction(formData: FormData): Promise<WorkItemMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const itemId = required(formData, "itemId")
  const repository = await WorkspaceRepository.create()
  try {
    const kind = required(formData, "referenceKind")
    const value = required(formData, "referenceValue")
    const label = String(formData.get("referenceLabel") ?? "").trim() || undefined
    const reference = attachmentReferenceSchema.parse(
      kind === "repository_file"
        ? { kind, path: value, label }
        : kind === "external_url"
          ? { kind, url: value, label }
          : { kind: "workbench_document", documentId: value, label },
    )
    const current = await repository.getWorkItem(projectId, itemId)
    const item = await repository.updateWorkItem(
      projectId,
      itemId,
      { references: [...current.references, reference] },
      required(formData, "revision"),
    )
    revalidatePath(`/projects/${projectId}`, "layout")
    return { status: "success", itemId: item.id, revision: item.revision, message: "Evidência vinculada." }
  } catch (error) {
    return workItemFailure(repository, projectId, itemId, error)
  }
}

export async function createBacklogItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  const siteId = String(formData.get("siteId") ?? "").trim()
  const item = await repository.createBacklogItem(projectId, {
    title: required(formData, "title"),
    description: String(formData.get("description") ?? "").trim(),
    priority: prioritySchema.parse(formData.get("priority") ?? "medium"),
    workScope: backlogWorkScopeSchema.parse(
      siteId ? { kind: "site", id: siteId } : { kind: "project" },
    ),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    acceptanceCriteria: lines(formData.get("acceptanceCriteria")),
  })
  revalidatePath(`/projects/${projectId}`, "layout")
  redirect(`/projects/${projectId}/backlog/${item.id}`)
}

export async function updateBacklogItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const itemId = required(formData, "itemId")
  const repository = await WorkspaceRepository.create()
  const status = backlogStatusSchema.parse(formData.get("status"))
  const updated = await repository.updateBacklogItem(
    projectId,
    itemId,
    {
      title: required(formData, "title"),
      description: String(formData.get("description") ?? "").trim(),
      status,
      priority: prioritySchema.parse(formData.get("priority")),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      dependencyIds: String(formData.get("dependencyIds") ?? "")
        .split(/[\n,]/)
        .map((id) => id.trim())
        .filter(Boolean),
    },
    required(formData, "revision"),
  )
  if (updated.status === "done") {
    await enqueueOptionalNotifications(repository.repositoryRoot, {
      projectId,
      event: "completed",
      idempotencyKey: `backlog:${updated.id}:completed:${updated.revision}`,
      title: "Tarefa concluída",
      body: updated.title,
      workbenchPath: `/projects/${projectId}/backlog/${updated.id}`,
      backlogItemId: updated.id,
    })
  }
  revalidatePath(`/projects/${projectId}`, "layout")
}

export async function addBacklogReferenceAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const itemId = required(formData, "itemId")
  const kind = required(formData, "referenceKind")
  const value = required(formData, "referenceValue")
  const label = String(formData.get("label") ?? "").trim() || undefined
  const reference = attachmentReferenceSchema.parse(
    kind === "repository_file"
      ? { kind, path: value, label }
      : kind === "external_url"
        ? { kind, url: value, label }
        : { kind: "workbench_document", documentId: value, label },
  )
  const repository = await WorkspaceRepository.create()
  const item = await repository.getBacklogItem(projectId, itemId)
  await repository.updateBacklogItem(
    projectId,
    itemId,
    { references: [...item.references, reference] },
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}/backlog/${itemId}`)
}

export async function toggleCriterionAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const itemId = required(formData, "itemId")
  const criterionId = required(formData, "criterionId")
  const repository = await WorkspaceRepository.create()
  const item = await repository.getBacklogItem(projectId, itemId)
  await repository.updateBacklogItem(
    projectId,
    itemId,
    {
      acceptanceCriteria: item.acceptanceCriteria.map((criterion) =>
        criterion.id === criterionId
          ? { ...criterion, completed: !criterion.completed }
          : criterion,
      ),
    },
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}/backlog/${itemId}`)
}

export async function archiveBacklogItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const itemId = required(formData, "itemId")
  const repository = await WorkspaceRepository.create()
  await repository.updateBacklogItem(
    projectId,
    itemId,
    { status: "archived" },
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}`, "layout")
  redirect(`/projects/${projectId}/backlog`)
}

export async function addRoadmapPhaseAction(formData: FormData): Promise<RoadmapMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  const phaseId = `phase_${randomUUID()}`
  try {
    const roadmap = await repository.getRoadmap(projectId)
    const phase: RoadmapPhase = {
      id: phaseId,
      title: required(formData, "title"),
      outcome: String(formData.get("outcome") ?? "").trim(),
      status: roadmap.phases.length === 0 ? "active" : "planned",
      initiatives: [],
    }
    const next = await repository.updateRoadmap(
      projectId,
      [...roadmap.phases, phase],
      required(formData, "revision"),
      "human",
      { action: "roadmap.phase_created", summary: `Fase criada: ${phase.title}`, entityId: phase.id },
    )
    revalidatePath(`/projects/${projectId}/roadmap`)
    return { status: "success", entityId: phase.id, revision: next.revision, message: "Fase criada." }
  } catch (error) {
    return roadmapFailure(repository, projectId, phaseId, error)
  }
}

export async function addRoadmapInitiativeAction(formData: FormData): Promise<RoadmapMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const phaseId = required(formData, "phaseId")
  const repository = await WorkspaceRepository.create()
  const initiativeId = `ini_${randomUUID()}`
  try {
    const roadmap = await repository.getRoadmap(projectId)
    const title = required(formData, "title")
    const phases = roadmap.phases.map((phase) =>
      phase.id === phaseId
        ? {
            ...phase,
            initiatives: [
              ...phase.initiatives,
              {
                id: initiativeId,
                title,
                outcome: String(formData.get("outcome") ?? "").trim(),
                status: "planned" as const,
                domain: String(formData.get("domain") ?? "").trim() || undefined,
                responsible: String(formData.get("responsible") ?? "").trim() || undefined,
                startDate: String(formData.get("startDate") ?? "").trim() || undefined,
                targetDate: String(formData.get("targetDate") ?? "").trim() || undefined,
                backlogIds: roadmapBacklogIds(formData.get("backlogIds")),
              },
            ],
          }
        : phase,
    )
    if (!phases.some((phase) => phase.id === phaseId)) throw new Error("Fase não encontrada.")
    const next = await repository.updateRoadmap(
      projectId,
      phases,
      required(formData, "revision"),
      "human",
      { action: "roadmap.initiative_created", summary: `Iniciativa criada: ${title}`, entityId: initiativeId },
    )
    revalidatePath(`/projects/${projectId}/roadmap`)
    return { status: "success", entityId: initiativeId, revision: next.revision, message: "Iniciativa criada." }
  } catch (error) {
    return roadmapFailure(repository, projectId, initiativeId, error)
  }
}

export async function saveRoadmapInitiativeAction(formData: FormData): Promise<RoadmapMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const phaseId = required(formData, "phaseId")
  const initiativeId = required(formData, "initiativeId")
  const repository = await WorkspaceRepository.create()
  try {
    const roadmap = await repository.getRoadmap(projectId)
    let found = false
    const title = required(formData, "title")
    const phases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase
      return {
        ...phase,
        initiatives: phase.initiatives.map((initiative) => {
          if (initiative.id !== initiativeId) return initiative
          found = true
          return {
            ...initiative,
            title,
            outcome: String(formData.get("outcome") ?? "").trim(),
            status: roadmapStatusSchema.parse(formData.get("status")),
            domain: String(formData.get("domain") ?? "").trim() || undefined,
            responsible: String(formData.get("responsible") ?? "").trim() || undefined,
            startDate: String(formData.get("startDate") ?? "").trim() || undefined,
            targetDate: String(formData.get("targetDate") ?? "").trim() || undefined,
            backlogIds: roadmapBacklogIds(formData.get("backlogIds")),
          }
        }),
      }
    })
    if (!found) throw new Error("Iniciativa não encontrada.")
    const next = await repository.updateRoadmap(
      projectId,
      phases,
      required(formData, "revision"),
      "human",
      { action: "roadmap.initiative_updated", summary: `Iniciativa atualizada: ${title}`, entityId: initiativeId },
    )
    revalidatePath(`/projects/${projectId}/roadmap`)
    return { status: "success", entityId: initiativeId, revision: next.revision, message: "Iniciativa salva." }
  } catch (error) {
    return roadmapFailure(repository, projectId, initiativeId, error)
  }
}

export async function addRoadmapMarkerAction(formData: FormData): Promise<RoadmapMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const phaseId = required(formData, "phaseId")
  const repository = await WorkspaceRepository.create()
  const markerId = `marker_${randomUUID()}`
  try {
    const roadmap = await repository.getRoadmap(projectId)
    const phase = roadmap.phases.find((item) => item.id === phaseId)
    if (!phase) throw new Error("Fase não encontrada.")
    const initiativeId = String(formData.get("initiativeId") ?? "").trim() || undefined
    if (initiativeId && !phase.initiatives.some((item) => item.id === initiativeId)) throw new Error("A iniciativa não pertence à fase selecionada.")
    const kind = roadmapMarkerKindSchema.parse(formData.get("kind"))
    const reference = optionalAttachmentReference(formData)
    const marker = roadmapMarkerSchema.parse({
      id: markerId, phaseId, initiativeId, kind, status: "planned",
      title: required(formData, "title"), description: String(formData.get("description") ?? "").trim(),
      targetDate: required(formData, "targetDate"), responsible: String(formData.get("responsible") ?? "").trim() || undefined,
      backlogIds: roadmapBacklogIds(formData.get("backlogIds")), references: reference ? [reference] : [],
    })
    const next = await repository.updateRoadmapMarkers(projectId, [...roadmap.markers, marker], required(formData, "revision"), "human", {
      action: "roadmap.marker_created", summary: `Marcador criado: ${marker.title}`, entityId: marker.id,
    })
    revalidatePath(`/projects/${projectId}/roadmap`)
    return { status: "success", entityId: marker.id, revision: next.revision, message: "Marcador criado." }
  } catch (error) {
    return roadmapFailure(repository, projectId, markerId, error)
  }
}

export async function saveRoadmapMarkerAction(formData: FormData): Promise<RoadmapMutationResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const markerId = required(formData, "markerId")
  const repository = await WorkspaceRepository.create()
  try {
    const [roadmap, workItems] = await Promise.all([repository.getRoadmap(projectId), repository.listWorkItems(projectId)])
    const current = roadmap.markers.find((marker) => marker.id === markerId)
    if (!current) throw new Error("Marcador não encontrado.")
    const phaseId = required(formData, "phaseId")
    const phase = roadmap.phases.find((item) => item.id === phaseId)
    if (!phase) throw new Error("Fase não encontrada.")
    const initiativeId = String(formData.get("initiativeId") ?? "").trim() || undefined
    if (initiativeId && !phase.initiatives.some((item) => item.id === initiativeId)) throw new Error("A iniciativa não pertence à fase selecionada.")
    const reference = optionalAttachmentReference(formData)
    const references = reference ? [...current.references, reference] : current.references
    const nextStatus = (current.kind === "validation_gate" || current.kind === "decision_gate")
      ? roadmapGateStatusSchema.parse(formData.get("status"))
      : roadmapOutcomeMarkerStatusSchema.parse(formData.get("status"))
    const reviewedBy = String(formData.get("reviewedBy") ?? "").trim() || undefined
    const waiverReason = String(formData.get("waiverReason") ?? "").trim() || undefined
    const candidate = roadmapMarkerSchema.parse({
      ...current, phaseId, initiativeId, status: nextStatus,
      title: required(formData, "title"), description: String(formData.get("description") ?? "").trim(),
      targetDate: required(formData, "targetDate"), responsible: String(formData.get("responsible") ?? "").trim() || undefined,
      backlogIds: roadmapBacklogIds(formData.get("backlogIds")), references,
      reviewedBy, waiverReason, reviewNote: String(formData.get("reviewNote") ?? "").trim() || undefined,
      reviewedAt: ["passed", "failed", "waived"].includes(nextStatus) ? new Date().toISOString() : undefined,
    })
    if (candidate.status !== current.status) {
      assertRoadmapMarkerStatusChange(current, candidate.status, {
        actor: "human", evidenceAvailable: markerHasReviewableEvidence(candidate, workItems), reviewedBy, waiverReason,
      })
    }
    const isGate = candidate.kind === "validation_gate" || candidate.kind === "decision_gate"
    const action = reference ? "roadmap.marker_evidence_linked"
      : candidate.status !== current.status && isGate && candidate.status === "pending_review" ? "roadmap.gate_submitted"
        : candidate.status !== current.status && isGate && candidate.status === "waived" ? "roadmap.gate_waived"
          : candidate.status !== current.status && isGate ? "roadmap.gate_reviewed"
            : candidate.status !== current.status ? "roadmap.marker_status_changed" : "roadmap.marker_updated"
    const next = await repository.updateRoadmapMarkers(projectId, roadmap.markers.map((marker) => marker.id === markerId ? candidate : marker), required(formData, "revision"), "human", {
      action, summary: `Marcador atualizado: ${candidate.title} (${candidate.status}).`, entityId: markerId,
    })
    revalidatePath(`/projects/${projectId}/roadmap`)
    return { status: "success", entityId: markerId, revision: next.revision, message: reference ? "Evidência vinculada." : "Marcador salvo." }
  } catch (error) {
    return roadmapFailure(repository, projectId, markerId, error)
  }
}

export async function advanceRoadmapInitiativeAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const phaseId = required(formData, "phaseId")
  const initiativeId = required(formData, "initiativeId")
  const repository = await WorkspaceRepository.create()
  const roadmap = await repository.getRoadmap(projectId)
  const nextStatus = {
    planned: "active",
    active: "completed",
    paused: "active",
    completed: "completed",
  } as const
  const phases = roadmap.phases.map((phase) => {
    if (phase.id !== phaseId) return phase
    const initiatives = phase.initiatives.map((initiative) =>
      initiative.id === initiativeId
        ? { ...initiative, status: nextStatus[initiative.status] }
        : initiative,
    )
    if (!initiatives.some((initiative) => initiative.id === initiativeId)) {
      throw new Error("Iniciativa não encontrada.")
    }
    return { ...phase, initiatives }
  })
  if (!phases.some((phase) => phase.id === phaseId)) throw new Error("Fase não encontrada.")
  await repository.updateRoadmap(
    projectId,
    phases,
    required(formData, "revision"),
    "human",
    { action: "roadmap.initiative_status_changed", summary: "Estado da iniciativa atualizado.", entityId: initiativeId },
  )
  revalidatePath(`/projects/${projectId}/roadmap`)
}

export async function initializeRoadmapScorecardAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  const roadmap = await repository.getRoadmap(projectId)
  if (roadmap.goals.length) throw new Error("O score 0–100 já foi inicializado.")
  await repository.updateRoadmapGoals(
    projectId,
    createMaturityGoalCatalog(),
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}/roadmap`)
}

export async function toggleRoadmapGoalAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const goalId = required(formData, "goalId")
  const repository = await WorkspaceRepository.create()
  const roadmap = await repository.getRoadmap(projectId)
  if (!roadmap.goals.some((goal) => goal.id === goalId)) throw new Error("Meta não encontrada.")
  await repository.updateRoadmapGoals(
    projectId,
    roadmap.goals.map((goal) =>
      goal.id === goalId ? { ...goal, score: goal.score === 1 ? 0 : 1 } : goal,
    ),
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}/roadmap`)
}

export async function reconcileRoadmapScoreAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  if (projectId !== "matriz-workbench") {
    throw new Error("A auditoria automática disponível é específica do Matriz Workbench.")
  }
  const repository = await WorkspaceRepository.create()
  const roadmap = await repository.getRoadmap(projectId)
  const audit = await auditWorkbenchMaturity(repository.repositoryRoot, roadmap.goals)
  await repository.updateRoadmapGoals(
    projectId,
    audit.goals,
    required(formData, "revision"),
    "system",
  )
  revalidatePath(`/projects/${projectId}`, "layout")
}

export async function initializeRoadmapScorecardsAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  const roadmap = await repository.getRoadmap(projectId)
  const definitions = definitionsForProject(projectId)
  if (!definitions.length) throw new Error("Não há trilhas especializadas para este projeto.")
  const existingSlugs = new Set(roadmap.scorecards.map((scorecard) => scorecard.slug))
  const additions = definitions
    .filter((definition) => !existingSlugs.has(definition.slug))
    .map(createScorecard)
  if (!additions.length) throw new Error("As trilhas especializadas já foram inicializadas.")
  await repository.updateRoadmapScorecards(
    projectId,
    [...roadmap.scorecards, ...additions],
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}/roadmap`)
}

export async function toggleRoadmapScorecardGoalAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const scorecardId = required(formData, "scorecardId")
  const goalId = required(formData, "goalId")
  const repository = await WorkspaceRepository.create()
  const roadmap = await repository.getRoadmap(projectId)
  let found = false
  const scorecards = roadmap.scorecards.map((scorecard) => {
    if (scorecard.id !== scorecardId) return scorecard
    if (!scorecard.goals.some((goal) => goal.id === goalId)) return scorecard
    found = true
    return {
      ...scorecard,
      goals: scorecard.goals.map((goal) =>
        goal.id === goalId ? { ...goal, score: goal.score === 1 ? 0 as const : 1 as const } : goal,
      ),
    }
  })
  if (!found) throw new Error("Meta da trilha não encontrada.")
  await repository.updateRoadmapScorecards(
    projectId,
    scorecards,
    required(formData, "revision"),
  )
  revalidatePath(`/projects/${projectId}/roadmap`)
}

export async function createAgentRequestAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  const request = await repository.createAgentRequest(
    projectId,
    required(formData, "backlogItemId"),
    String(formData.get("instructions") ?? "").trim(),
  )
  revalidatePath(`/projects/${projectId}`, "layout")
  redirect(`/projects/${projectId}/agents#${request.id}`)
}

export async function reviewAgentExecutionAction(
  formData: FormData,
): Promise<AgentExecutionReviewResult> {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const requestId = required(formData, "requestId")
  const revision = required(formData, "revision")
  const statusValue = required(formData, "reviewStatus")
  const status = statusValue === "approved" || statusValue === "changes_requested"
    ? statusValue
    : undefined
  if (!status) return { status: "error", message: "Decisão de revisão inválida." }
  const repository = await WorkspaceRepository.create()
  try {
    const request = await repository.reviewAgentRequest(projectId, requestId, {
      status,
      reviewedBy: required(formData, "reviewedBy"),
      note: String(formData.get("reviewNote") ?? ""),
      runRevision: String(formData.get("runRevision") ?? "").trim() || undefined,
    }, revision, "human")
    revalidatePath(`/projects/${projectId}/agents/${requestId}`)
    revalidatePath(`/projects/${projectId}/backlog/${request.backlogItemId}`)
    revalidatePath(`/projects/${projectId}/backlog`)
    return {
      status: "success",
      requestId,
      revision: request.revision,
      message: status === "approved"
        ? "Execução aprovada. O estado do produto não foi alterado."
        : "Alterações solicitadas. O estado do produto não foi alterado.",
    }
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      const latest = await repository.getAgentRequest(projectId, requestId).catch(() => undefined)
      return {
        status: "conflict",
        requestId,
        latestRevision: latest?.revision ?? "unknown",
        message: error.message,
      }
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Não foi possível revisar a execução.",
    }
  }
}

export async function captureInboxItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const item = await repository.createInboxItem({
    title: required(formData, "title"),
    detail: String(formData.get("detail") ?? "").trim(),
    origin: inboxOriginSchema.parse(formData.get("origin") ?? "human"),
    suggestedProjectId: String(formData.get("suggestedProjectId") ?? "").trim() || undefined,
    suggestedKind: formData.get("suggestedKind") ? workItemKindSchema.parse(formData.get("suggestedKind")) : undefined,
  })
  revalidatePath("/work", "layout")
  redirect(`/work/inbox?item=${item.id}`)
}

export async function triageInboxItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const itemId = required(formData, "itemId")
  await repository.updateInboxItem(itemId, {
    title: required(formData, "title"),
    detail: String(formData.get("detail") ?? "").trim(),
    reason: String(formData.get("reason") ?? "").trim(),
    suggestedProjectId: String(formData.get("suggestedProjectId") ?? "").trim() || undefined,
    suggestedKind: formData.get("suggestedKind") ? workItemKindSchema.parse(formData.get("suggestedKind")) : undefined,
    suggestedDomain: String(formData.get("suggestedDomain") ?? "").trim() || undefined,
    suggestedPriority: prioritySchema.parse(formData.get("suggestedPriority") ?? "medium"),
    groupKey: String(formData.get("groupKey") ?? "").trim() || undefined,
    duplicateOf: String(formData.get("duplicateOf") ?? "").trim() || undefined,
    status: "triaged",
  }, required(formData, "revision"))
  revalidatePath("/work/inbox")
  redirect(`/work/inbox?item=${itemId}`)
}

export async function acceptInboxItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const itemId = required(formData, "itemId")
  const result = await repository.acceptInboxItem(itemId, {
    projectId: required(formData, "projectId"),
    kind: workItemKindSchema.parse(formData.get("kind") ?? "task"),
    parentId: String(formData.get("parentId") ?? "").trim() || undefined,
    priority: prioritySchema.parse(formData.get("priority") ?? "medium"),
  }, required(formData, "revision"))
  revalidatePath("/work", "layout")
  revalidatePath(`/projects/${result.workItem.projectId}`, "layout")
  redirect(`/projects/${result.workItem.projectId}/backlog/${result.workItem.id}`)
}

export async function discardInboxItemAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  await repository.discardInboxItem(
    required(formData, "itemId"),
    required(formData, "discardReason"),
    required(formData, "revision"),
  )
  revalidatePath("/work/inbox")
  redirect("/work/inbox")
}

export async function createSprintAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprint = await repository.createSprint({
    name: required(formData, "name"),
    intent: required(formData, "intent"),
    startDate: required(formData, "startDate"),
    endDate: required(formData, "endDate"),
    wipLimit: Number(formData.get("wipLimit") ?? 4),
    confidence: formData.get("confidence") ? Number(formData.get("confidence")) : undefined,
    confidenceRationale: String(formData.get("confidenceRationale") ?? "").trim(),
    risks: lines(formData.get("risks")),
  })
  revalidatePath("/work/sprints")
  redirect(`/work/sprints/${sprint.id}`)
}

export async function bulkWorkItemsAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const references = formData.getAll("workRef").flatMap((value) => {
    if (typeof value !== "string") return []
    const [projectId, itemId, revision] = value.split(":")
    return projectId && itemId && revision ? [{ projectId, itemId, revision }] : []
  })
  if (!references.length) redirect("/work/backlog?bulk=empty")
  const operation = required(formData, "operation")
  const supportedOperations = new Set(["priority", "domain", "archive", "promote"])
  if (!supportedOperations.has(operation)) throw new WorkspaceError("Ação em massa não suportada.", "INVALID_DATA")

  const currentItems = await Promise.all(
    references.map((reference) => repository.getWorkItem(reference.projectId, reference.itemId)),
  )
  if (currentItems.some((item, index) => item.revision !== references[index]?.revision)) {
    throw new RevisionConflictError()
  }

  const bulkPriority = operation === "priority" ? prioritySchema.parse(formData.get("bulkPriority")) : undefined
  const bulkDomain = operation === "domain" ? required(formData, "bulkDomain") : undefined
  const bulkArchiveReason = operation === "archive" ? required(formData, "bulkArchiveReason") : undefined
  if (operation === "promote") {
    const [sprintId, outcomeCommitmentId] = required(formData, "sprintCommitment").split(":")
    if (!sprintId || !outcomeCommitmentId) throw new WorkspaceError("Escolha um outcome de sprint.", "INVALID_DATA")
    const sprint = await repository.getSprint(sprintId)
    const currentKeys = new Set(sprint.work.map((item) => `${item.projectId}:${item.workItemId}`))
    const additions = references
      .filter((reference) => !currentKeys.has(`${reference.projectId}:${reference.itemId}`))
      .map((reference) => ({ projectId: reference.projectId, workItemId: reference.itemId, outcomeCommitmentId, executionMode: "human" as const, addedAt: new Date().toISOString() }))
    await repository.updateSprint(sprintId, { work: [...sprint.work, ...additions] }, sprint.revision)
  } else {
    for (const reference of references) {
      if (operation === "priority") {
        await repository.updateWorkItem(reference.projectId, reference.itemId, { priority: bulkPriority }, reference.revision)
      } else if (operation === "domain") {
        await repository.updateWorkItem(reference.projectId, reference.itemId, { domain: bulkDomain }, reference.revision)
      } else if (operation === "archive") {
        await repository.updateWorkItem(reference.projectId, reference.itemId, { productStatus: "archived", archive: { reason: bulkArchiveReason ?? "", actor: "human", archivedAt: new Date().toISOString() } }, reference.revision)
      }
    }
  }
  revalidatePath("/work", "layout")
  redirect(`/work/backlog?bulk=${operation}`)
}

export async function saveSprintAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprintId = required(formData, "sprintId")
  await repository.updateSprint(sprintId, {
    name: required(formData, "name"),
    intent: required(formData, "intent"),
    startDate: required(formData, "startDate"),
    endDate: required(formData, "endDate"),
    status: sprintStatusSchema.parse(formData.get("status")),
    wipLimit: Number(formData.get("wipLimit") ?? 4),
    wipOverrideReason: String(formData.get("wipOverrideReason") ?? "").trim() || undefined,
    confidence: formData.get("confidence") ? Number(formData.get("confidence")) : undefined,
    confidenceRationale: String(formData.get("confidenceRationale") ?? "").trim(),
    risks: lines(formData.get("risks")),
  }, required(formData, "revision"))
  revalidatePath(`/work/sprints/${sprintId}`)
  redirect(`/work/sprints/${sprintId}`)
}

export async function addSprintOutcomeAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprintId = required(formData, "sprintId")
  const encodedRef = String(formData.get("outcomeRef") ?? "").trim()
  const [encodedKind, encodedProjectId, encodedReferenceId] = encodedRef.split(":")
  const projectId = encodedProjectId || required(formData, "projectId")
  const referenceKind = (encodedKind || formData.get("referenceKind")) === "roadmap_initiative" ? "roadmap_initiative" as const : "work_item_outcome" as const
  const referenceId = encodedReferenceId || required(formData, "referenceId")
  const sprint = await repository.getSprint(sprintId)
  let title: string
  const ref = referenceKind === "work_item_outcome"
    ? { kind: referenceKind, projectId, workItemId: referenceId }
    : { kind: referenceKind, projectId, initiativeId: referenceId }
  if (referenceKind === "work_item_outcome") {
    title = (await repository.getWorkItem(projectId, referenceId)).title
  } else {
    const roadmap = await repository.getRoadmap(projectId)
    const initiative = roadmap.phases.flatMap((phase) => phase.initiatives).find((item) => item.id === referenceId)
    if (!initiative) throw new WorkspaceError("Iniciativa não encontrada.", "NOT_FOUND")
    title = initiative.title
  }
  await repository.updateSprint(sprintId, {
    outcomes: [...sprint.outcomes, {
      id: `commit_${randomUUID()}`,
      ref,
      title,
      resultSummary: "",
      evidenceRefs: [],
    }],
  }, required(formData, "revision"))
  revalidatePath(`/work/sprints/${sprintId}`)
  redirect(`/work/sprints/${sprintId}`)
}

export async function addSprintWorkAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprintId = required(formData, "sprintId")
  const sprint = await repository.getSprint(sprintId)
  const encodedWorkRef = String(formData.get("workRef") ?? "").trim()
  const [encodedProjectId, encodedWorkItemId] = encodedWorkRef.split(":")
  const projectId = encodedProjectId || required(formData, "projectId")
  const workItemId = encodedWorkItemId || required(formData, "workItemId")
  if (!projectId || !workItemId) throw new WorkspaceError("Escolha um work item.", "INVALID_DATA")
  await repository.updateSprint(sprintId, {
    work: [...sprint.work, {
      projectId,
      workItemId,
      outcomeCommitmentId: required(formData, "outcomeCommitmentId"),
      executionMode: sprintExecutionModeSchema.parse(formData.get("executionMode") ?? "human"),
      addedAt: new Date().toISOString(),
    }],
  }, required(formData, "revision"))
  revalidatePath(`/work/sprints/${sprintId}`)
  redirect(`/work/sprints/${sprintId}`)
}

export async function addSprintDependencyAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprintId = required(formData, "sprintId")
  const sprint = await repository.getSprint(sprintId)
  const [fromProjectId, fromWorkItemId] = required(formData, "fromRef").split(":")
  const [toProjectId, toWorkItemId] = required(formData, "toRef").split(":")
  if (!fromProjectId || !fromWorkItemId || !toProjectId || !toWorkItemId) throw new WorkspaceError("Escolha os dois work items da dependência.", "INVALID_DATA")
  await repository.updateSprint(sprintId, {
    crossProjectDependencies: [...sprint.crossProjectDependencies, {
      fromProjectId,
      fromWorkItemId,
      toProjectId,
      toWorkItemId,
      summary: required(formData, "summary"),
    }],
  }, required(formData, "revision"))
  revalidatePath(`/work/sprints/${sprintId}`)
  redirect(`/work/sprints/${sprintId}`)
}

export async function decideSprintOutcomeAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprintId = required(formData, "sprintId")
  const commitmentId = required(formData, "commitmentId")
  const sprint = await repository.getSprint(sprintId)
  await repository.updateSprint(sprintId, {
    outcomes: sprint.outcomes.map((outcome) => outcome.id === commitmentId ? {
      ...outcome,
      result: sprintOutcomeResultSchema.parse(formData.get("result")),
      resultSummary: required(formData, "resultSummary"),
      evidenceRefs: lines(formData.get("evidenceRefs")),
    } : outcome),
  }, required(formData, "revision"))
  revalidatePath(`/work/sprints/${sprintId}`)
  redirect(`/work/sprints/${sprintId}`)
}

export async function closeSprintAction(formData: FormData) {
  await requireWorkbenchSession()
  const repository = await WorkspaceRepository.create()
  const sprintId = required(formData, "sprintId")
  const sprint = await repository.getSprint(sprintId)
  const expectedRevision = required(formData, "revision")
  if (sprint.revision !== expectedRevision) throw new RevisionConflictError()
  if (sprint.outcomes.some((outcome) => !outcome.result)) {
    throw new WorkspaceError("Todos os outcomes precisam de uma decisão antes do encerramento.", "INVALID_DATA")
  }
  const summary = required(formData, "summary")
  const slug = `sprint-${sprint.name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70)}`
  const currentDocument = await repository.readDocument("matriz-infra-hub", "product", slug).catch(() => undefined)
  const document = await repository.writeDocument("matriz-infra-hub", {
    kind: "product",
    slug,
    title: `Memória · ${sprint.name}`,
    content: `# ${sprint.name}\n\n${summary}\n\n## Outcomes\n\n${sprint.outcomes.map((outcome) => `- **${outcome.title}** — ${outcome.result ?? "sem decisão"}: ${outcome.resultSummary}`).join("\n")}`,
    tags: ["sprint", "memory"],
  }, currentDocument?.revision)
  await repository.updateSprint(sprintId, {
    status: "completed",
    closure: {
      summary,
      memoryDocumentRef: `product/${document.slug}`,
      nextSprintId: String(formData.get("nextSprintId") ?? "").trim() || undefined,
      closedBy: "human",
      closedAt: new Date().toISOString(),
    },
  }, expectedRevision)
  await repository.appendActivity("matriz-infra-hub", {
    actor: "human",
    action: "memory.recorded",
    summary: `Memória final registrada para ${sprint.name}.`,
    entityType: "sprint",
    entityId: sprintId,
    metadata: { documentId: document.id },
  })
  revalidatePath("/work/sprints", "layout")
  redirect(`/work/sprints/${sprintId}`)
}

export async function writeDocumentAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const kind = required(formData, "kind") as WorkbenchDocument["kind"]
  const slug = required(formData, "slug")
  const repository = await WorkspaceRepository.create()
  await repository.writeDocument(projectId, {
    kind,
    slug,
    title: required(formData, "title"),
    content: String(formData.get("content") ?? ""),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  }, String(formData.get("revision") ?? "") || undefined)
  revalidatePath(`/projects/${projectId}`, "layout")
  redirect(`/projects/${projectId}/docs/${kind}/${slug}`)
}

export async function reviewControlEvidenceAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const evidenceId = required(formData, "evidenceId")
  const decision = formData.get("decision") === "rejected" ? "rejected" as const : "approved" as const
  const repository = await WorkspaceRepository.create()
  await repository.reviewControlEvidence(projectId, evidenceId, decision, required(formData, "revision"))
  const [roadmap, policy, evidence] = await Promise.all([repository.getRoadmap(projectId), repository.getControlPolicy(projectId), repository.listControlEvidence(projectId)])
  await repository.writeControlScoreSummary(projectId, buildScoreSummary(roadmap, policy, evidence))
  revalidatePath("/control")
}

export async function createControlSnippetAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  const input = snippetSchema.pick({ command: true, title: true, content: true, tags: true }).parse({
    command: required(formData, "command"),
    title: required(formData, "title"),
    content: required(formData, "content"),
    tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
  })
  await repository.createSnippet(projectId, input)
  revalidatePath("/control")
}

function teamPath(projectId: string): string {
  return `/team?projectId=${encodeURIComponent(projectId)}`
}

export async function initializeAgentTeamAction(formData: FormData) {
  await requireWorkbenchSession()
  const projectId = required(formData, "projectId")
  const repository = await WorkspaceRepository.create()
  await repository.initializeProject(projectId)
  await new AgentTeamService(repository).initialize(projectId)
  revalidatePath("/team")
  redirect(teamPath(projectId))
}

export async function createAgentTeamProfileAction(formData: FormData) {
  await requireWorkbenchSession()
  const parsed = parseAgentTeamForm("profile", formData)
  const repository = await WorkspaceRepository.create()
  await new AgentTeamService(repository).createProfile(parsed.projectId, parsed.input)
  revalidatePath("/team")
  redirect(teamPath(parsed.projectId))
}

export async function createAgentTeamMissionAction(formData: FormData) {
  await requireWorkbenchSession()
  const parsed = parseAgentTeamForm("mission", formData)
  const repository = await WorkspaceRepository.create()
  await new AgentTeamService(repository).createMission(parsed.projectId, parsed.input)
  revalidatePath("/team")
  redirect(teamPath(parsed.projectId))
}

export async function transitionAgentTeamMissionAction(formData: FormData) {
  await requireWorkbenchSession()
  const parsed = parseAgentTeamForm("transition", formData)
  const repository = await WorkspaceRepository.create()
  await new AgentTeamService(repository).transitionMission(
    parsed.projectId,
    parsed.missionId,
    parsed.target,
    parsed.revision,
  )
  revalidatePath("/team")
  redirect(teamPath(parsed.projectId))
}

export async function recordAgentTeamEvidenceAction(formData: FormData) {
  await requireWorkbenchSession()
  const parsed = parseAgentTeamForm("evidence", formData)
  const repository = await WorkspaceRepository.create()
  await new AgentTeamService(repository).addEvidence(
    parsed.projectId,
    parsed.missionId,
    withServerEvidenceId(parsed.input),
    parsed.revision,
  )
  revalidatePath("/team")
  redirect(teamPath(parsed.projectId))
}

function withServerEvidenceId(input: MissionEvidenceInput): MissionEvidenceInput {
  const id = `evidence_${randomUUID()}`
  if (input.kind === "file") return { ...input, id }
  if (input.kind === "test") return { ...input, id }
  if (input.kind === "url") return { ...input, id }
  return { ...input, id }
}

export async function createAgentTeamHandoffAction(formData: FormData) {
  await requireWorkbenchSession()
  const parsed = parseAgentTeamForm("handoff", formData)
  const repository = await WorkspaceRepository.create()
  await new AgentTeamService(repository).createHandoff(
    parsed.projectId,
    parsed.missionId,
    parsed.input,
    parsed.revision,
  )
  revalidatePath("/team")
  redirect(teamPath(parsed.projectId))
}

export async function reviewAgentTeamMissionAction(formData: FormData) {
  await requireWorkbenchSession()
  const parsed = parseAgentTeamForm("review", formData)
  const repository = await WorkspaceRepository.create()
  await new AgentTeamService(repository).reviewMission(
    parsed.projectId,
    parsed.missionId,
    parsed.input,
    parsed.revision,
  )
  revalidatePath("/team")
  redirect(teamPath(parsed.projectId))
}
