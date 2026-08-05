import { createHash } from "node:crypto"
import { z } from "zod"
import type { AttachmentReference, WorkItem, WorkItemKind } from "../domain/schemas"
import { WorkspaceError } from "../domain/errors"
import type { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

const repositoryFileReferenceSchema = z.object({
  kind: z.literal("repository_file"),
  path: z.string().trim().min(1).max(500),
  label: z.string().trim().min(1).max(120).optional(),
}).strict()

const externalUrlReferenceSchema = z.object({
  kind: z.literal("external_url"),
  url: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  label: z.string().trim().min(1).max(120).optional(),
}).strict()

const workbenchDocumentReferenceSchema = z.object({
  kind: z.literal("workbench_document"),
  documentId: z.string().regex(/^doc_[0-9a-f-]{36}$/),
  label: z.string().trim().min(1).max(120).optional(),
}).strict()

const itemSchema = z.object({
  key: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/),
  kind: z.enum(["outcome", "feature", "task", "bug"]),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(8000),
  priority: z.enum(["critical", "high", "medium", "low"]),
  domain: z.string().trim().min(1).max(100).optional(),
  responsible: z.string().trim().min(1).max(100).optional(),
  parentKey: z.string().trim().min(1).max(120).optional(),
  dependencies: z.array(z.string().trim().min(1).max(120)).max(30),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).max(30),
  references: z.array(z.discriminatedUnion("kind", [
    repositoryFileReferenceSchema,
    externalUrlReferenceSchema,
    workbenchDocumentReferenceSchema,
  ])).max(30),
  originRef: z.object({ kind: z.literal("inbox"), id: z.string().regex(/^in_[0-9a-f-]{36}$/) }).strict().optional(),
  originKey: z.string().trim().min(1).max(300).optional(),
}).strict()

export const backlogBatchPlanSchema = z.object({
  schemaVersion: z.literal(1),
  batchId: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  expectedCount: z.literal(50),
  items: z.array(itemSchema).length(50),
}).strict()

export type BacklogBatchPlan = z.infer<typeof backlogBatchPlanSchema>
export type BacklogBatchMode = "dry-run" | "apply" | "resume"

export const backlogBatchReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  batchId: z.string(),
  projectId: z.string(),
  planFingerprint: z.string().length(64),
  scoreBaselineFingerprint: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  entries: z.record(z.discriminatedUnion("state", [
    z.object({ state: z.literal("creating") }).strict(),
    z.object({ state: z.literal("created"), workItemId: z.string().regex(/^wi_[0-9a-f-]{36}$/), completed: z.boolean() }).strict(),
  ])),
}).strict()

export type BacklogBatchReceipt = z.infer<typeof backlogBatchReceiptSchema>

export interface BacklogBatchReport {
  mode: BacklogBatchMode
  batchId: string
  projectId: string
  valid: boolean
  createdKeys: string[]
  reusedKeys: string[]
  skippedKeys: string[]
  failedKeys: string[]
}

function normalizedTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US")
}

function assertAcyclic(keys: readonly string[], edgesFor: (key: string) => readonly string[], label: string) {
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (key: string) => {
    if (visiting.has(key)) throw new WorkspaceError(`${label} contains a cycle.`, "INVALID_DATA")
    if (visited.has(key)) return
    visiting.add(key)
    for (const next of edgesFor(key)) visit(next)
    visiting.delete(key)
    visited.add(key)
  }
  for (const key of keys) visit(key)
}

function parentAllowed(parent: WorkItemKind, child: WorkItemKind) {
  return (parent === "outcome" && child !== "outcome") || (parent === "task" && child === "task")
}

function orderedByParent(plan: BacklogBatchPlan): BacklogBatchPlan["items"] {
  const byKey = new Map(plan.items.map((item) => [item.key, item]))
  const ordered: BacklogBatchPlan["items"] = []
  const placed = new Set<string>()
  const place = (key: string) => {
    if (placed.has(key)) return
    const item = byKey.get(key)!
    if (item.parentKey) place(item.parentKey)
    placed.add(key)
    ordered.push(item)
  }
  for (const item of plan.items) place(item.key)
  return ordered
}

async function preflight(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
  receipt: BacklogBatchReceipt | undefined,
): Promise<void> {
  const keys = new Set<string>()
  const byKey = new Map(plan.items.map((item) => [item.key, item]))
  for (const item of plan.items) {
    if (keys.has(item.key)) throw new WorkspaceError("Batch contains a duplicate logical key.", "INVALID_DATA")
    keys.add(item.key)
  }
  for (const item of plan.items) {
    if (item.parentKey) {
      const parent = byKey.get(item.parentKey)
      if (!parent || !parentAllowed(parent.kind, item.kind)) {
        throw new WorkspaceError("Batch contains an invalid parent relationship.", "INVALID_DATA")
      }
    }
    for (const dependency of item.dependencies) {
      if (!byKey.has(dependency)) throw new WorkspaceError("Batch contains a missing dependency.", "INVALID_DATA")
    }
  }
  assertAcyclic([...keys], (key) => byKey.get(key)?.parentKey ? [byKey.get(key)!.parentKey!] : [], "Parent graph")
  assertAcyclic([...keys], (key) => byKey.get(key)?.dependencies ?? [], "Dependency graph")

  for (const item of plan.items) await repository.validateWorkItemReferences(plan.projectId, item.references as AttachmentReference[])

  const existing = await repository.listWorkItems(plan.projectId)
  const receivedIds = new Set(Object.values(receipt?.entries ?? {})
    .flatMap((entry) => entry.state === "created" ? [entry.workItemId] : []))
  const existingTitles = new Set(existing.filter((item) => !receivedIds.has(item.id)).map((item) => normalizedTitle(item.title)))
  const plannedTitles = new Set<string>()
  const plannedOriginIds = new Set<string>()
  const plannedOriginKeys = new Set<string>()
  for (const item of plan.items) {
    const title = normalizedTitle(item.title)
    if (existingTitles.has(title) || plannedTitles.has(title)) {
      throw new WorkspaceError("Batch title collides with existing work.", "CONFLICT")
    }
    plannedTitles.add(title)
    if (item.originRef && plannedOriginIds.has(item.originRef.id)) {
      throw new WorkspaceError("Batch contains a duplicate Inbox origin reference.", "CONFLICT")
    }
    if (item.originRef) plannedOriginIds.add(item.originRef.id)
    if (item.originKey && plannedOriginKeys.has(item.originKey)) {
      throw new WorkspaceError("Batch contains a duplicate Inbox origin key.", "CONFLICT")
    }
    if (item.originKey) plannedOriginKeys.add(item.originKey)
    if (item.originRef && existing.some((work) => !receivedIds.has(work.id) && work.originRef?.id === item.originRef!.id)) {
      throw new WorkspaceError("Batch origin collides with existing Inbox work.", "CONFLICT")
    }
  }
  if (plan.items.some((item) => item.originKey)) {
    const unresolvedOriginKeys = new Set((await repository.listInboxItems())
      .filter((item) => item.status !== "discarded" && item.originKey)
      .map((item) => item.originKey))
    if (plan.items.some((item) => item.originKey && unresolvedOriginKeys.has(item.originKey))) {
      throw new WorkspaceError("Batch origin key collides with an unresolved Inbox entry.", "CONFLICT")
    }
  }
  const originIds = new Set(plan.items.flatMap((item) => item.originRef ? [item.originRef.id] : []))
  if (originIds.size) {
    for (const project of await repository.discoverProjects()) {
      if (!project.initialized || project.id === plan.projectId) continue
      const work = await repository.listWorkItems(project.id)
      if (work.some((item) => item.originRef && originIds.has(item.originRef.id))) {
        throw new WorkspaceError("Batch origin collides with work in another project.", "CONFLICT")
      }
    }
  }
}

function defaultsFor(kind: WorkItemKind) {
  return {
    productStatus: "discovery" as const,
    validationStatus: kind === "task" ? "not_required" as const : "pending" as const,
    humanReviewStatus: "not_required" as const,
    documentationStatus: kind === "outcome" ? "pending" as const : "not_required" as const,
  }
}

export function backlogBatchPlanFingerprint(plan: BacklogBatchPlan) {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex")
}

function hasImportedImmutableShape(
  item: WorkItem,
  candidate: BacklogBatchPlan["items"][number],
  projectId: string,
  parentId?: string,
) {
  return item.schemaVersion === 2 &&
    item.projectId === projectId &&
    item.kind === candidate.kind &&
    normalizedTitle(item.title) === normalizedTitle(candidate.title) &&
    item.description === candidate.description &&
    item.priority === candidate.priority &&
    item.domain === candidate.domain &&
    item.responsible === candidate.responsible &&
    item.parentId === parentId &&
    JSON.stringify(item.originRef) === JSON.stringify(candidate.originRef) &&
    JSON.stringify(item.workScope) === JSON.stringify({ kind: "project" }) &&
    JSON.stringify(item.tags) === JSON.stringify(candidate.tags) &&
    item.acceptanceCriteria.length === candidate.acceptanceCriteria.length &&
    item.acceptanceCriteria.every((criterion, index) => criterion.text === candidate.acceptanceCriteria[index])
}

function hasImportedCreationShape(
  item: WorkItem,
  candidate: BacklogBatchPlan["items"][number],
  projectId: string,
  parentId?: string,
) {
  const defaults = defaultsFor(candidate.kind)
  return item.schemaVersion === 2 &&
    hasImportedImmutableShape(item, candidate, projectId, parentId) &&
    item.productStatus === defaults.productStatus &&
    item.validationStatus === defaults.validationStatus &&
    item.humanReviewStatus === defaults.humanReviewStatus &&
    item.documentationStatus === defaults.documentationStatus &&
    item.acceptanceCriteria.every((criterion, index) => criterion.text === candidate.acceptanceCriteria[index] && !criterion.completed) &&
    item.references.length === 0 && item.dependencyIds.length === 0
}

function hasImportedFinalShape(
  item: WorkItem,
  candidate: BacklogBatchPlan["items"][number],
  projectId: string,
  parentId: string | undefined,
  dependencyIds: string[],
) {
  return hasImportedImmutableShape(item, candidate, projectId, parentId) &&
    item.dependencyIds.length === dependencyIds.length && item.dependencyIds.every((id, index) => id === dependencyIds[index]) &&
    JSON.stringify(item.references) === JSON.stringify(candidate.references)
}

export async function importBacklogBatch(
  repository: WorkspaceRepository,
  input: unknown,
  mode: BacklogBatchMode,
): Promise<BacklogBatchReport> {
  const plan = backlogBatchPlanSchema.parse(input)
  if (mode === "dry-run") return importLockedBacklogBatch(repository, plan, mode)
  return repository.withBacklogBatchLock(plan.projectId, plan.batchId, () => importLockedBacklogBatch(repository, plan, mode))
}

async function importLockedBacklogBatch(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
  mode: BacklogBatchMode,
): Promise<BacklogBatchReport> {
  const existingReceipt = await repository.readImportReceipt(plan.projectId, plan.batchId, backlogBatchReceiptSchema)
  const planFingerprint = backlogBatchPlanFingerprint(plan)
  if (existingReceipt && existingReceipt.planFingerprint !== planFingerprint) {
    throw new WorkspaceError("Batch ID already belongs to a different plan.", "CONFLICT")
  }
  const receipt = existingReceipt ?? {
    schemaVersion: 1 as const, batchId: plan.batchId, projectId: plan.projectId, planFingerprint, entries: {},
  }
  if (mode !== "dry-run") {
    const existing = await repository.listWorkItems(plan.projectId)
    const recoveredIds = new Map(Object.entries(receipt.entries).flatMap(([key, entry]) => entry.state === "created" ? [[key, entry.workItemId] as const] : []))
    let recovered = false
    for (const item of plan.items) {
      if (receipt.entries[item.key]?.state !== "creating") continue
      const matches = existing.filter((work) => hasImportedCreationShape(
        work,
        item,
        plan.projectId,
        item.parentKey ? recoveredIds.get(item.parentKey) : undefined,
      ))
      if (matches.length > 1) throw new WorkspaceError("Pending batch item cannot be recovered unambiguously.", "CONFLICT")
      if (matches.length === 1) {
        receipt.entries[item.key] = { state: "created", workItemId: matches[0].id, completed: false }
        recovered = true
      }
    }
    if (recovered) await repository.writeImportReceipt(plan.projectId, plan.batchId, receipt)
  }
  await preflight(repository, plan, receipt)
  const report: BacklogBatchReport = {
    mode, batchId: plan.batchId, projectId: plan.projectId, valid: true,
    createdKeys: [], reusedKeys: [], skippedKeys: [], failedKeys: [],
  }
  if (mode === "dry-run") return report

  const itemIds = new Map(Object.entries(receipt.entries)
    .flatMap(([key, entry]) => entry.state === "created" ? [[key, entry.workItemId] as const] : []))
  const persistReceipt = () => repository.writeImportReceipt(plan.projectId, plan.batchId, receipt)

  let repairedReceipt = false
  for (const item of plan.items) {
    const saved = receipt.entries[item.key]
    if (saved?.state !== "created") continue
    const current = await repository.getWorkItem(plan.projectId, saved.workItemId).catch(() => {
      throw new WorkspaceError("Batch receipt points to missing work.", "CONFLICT")
    })
    const parentId = item.parentKey ? itemIds.get(item.parentKey) : undefined
    const dependencyIds = item.dependencies.map((key) => itemIds.get(key)!)
    const final = hasImportedFinalShape(current, item, plan.projectId, parentId, dependencyIds)
    const valid = saved.completed ? final : final || hasImportedCreationShape(current, item, plan.projectId, parentId)
    if (!valid) throw new WorkspaceError("Batch receipt points to divergent work.", "CONFLICT")
    if (!saved.completed && final) {
      receipt.entries[item.key] = { ...saved, completed: true }
      repairedReceipt = true
    }
  }
  if (repairedReceipt) await persistReceipt()

  const creationOrder = orderedByParent(plan)
  for (const [index, item] of creationOrder.entries()) {
    const saved = receipt.entries[item.key]
    if (saved?.state === "created") {
      report.reusedKeys.push(item.key)
      itemIds.set(item.key, saved.workItemId)
      continue
    }
    try {
      if (!saved) {
        receipt.entries[item.key] = { state: "creating" }
        await persistReceipt()
      }
      const created = await repository.createWorkItem(plan.projectId, {
        kind: item.kind,
        title: item.title,
        description: item.description,
        priority: item.priority,
        domain: item.domain,
        responsible: item.responsible,
        originRef: item.originRef,
        parentId: item.parentKey ? itemIds.get(item.parentKey) : undefined,
        tags: item.tags,
        acceptanceCriteria: item.acceptanceCriteria,
        ...defaultsFor(item.kind),
      })
      receipt.entries[item.key] = { state: "created", workItemId: created.id, completed: false }
      itemIds.set(item.key, created.id)
      await persistReceipt()
      report.createdKeys.push(item.key)
    } catch {
      report.failedKeys.push(item.key)
      report.skippedKeys.push(...creationOrder.slice(index + 1).map((candidate) => candidate.key))
      return report
    }
  }

  for (const [index, item] of plan.items.entries()) {
    const saved = receipt.entries[item.key]
    if (!saved || saved.state !== "created") {
      report.failedKeys.push(item.key)
      return report
    }
    if (saved.completed) continue
    try {
      const current = await repository.getWorkItem(plan.projectId, saved.workItemId)
      const parentId = item.parentKey ? itemIds.get(item.parentKey) : undefined
      const dependencyIds = item.dependencies.map((key) => itemIds.get(key)!)
      if (hasImportedFinalShape(current, item, plan.projectId, parentId, dependencyIds)) {
        receipt.entries[item.key] = { ...saved, completed: true }
        await persistReceipt()
        continue
      }
      await repository.updateWorkItem(plan.projectId, saved.workItemId, {
        dependencyIds,
        references: item.references as AttachmentReference[],
      }, current.revision)
      receipt.entries[item.key] = { ...saved, completed: true }
      await persistReceipt()
    } catch {
      report.failedKeys.push(item.key)
      report.skippedKeys.push(...plan.items.slice(index + 1).map((candidate) => candidate.key))
      return report
    }
  }
  return report
}
