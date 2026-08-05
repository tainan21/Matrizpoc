import { createHash } from "node:crypto"
import { WorkspaceError } from "../domain/errors"
import type { Roadmap, WorkItem } from "../domain/schemas"
import type { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import {
  backlogBatchPlanFingerprint,
  backlogBatchReceiptSchema,
  importBacklogBatch,
  type BacklogBatchReceipt,
  type BacklogBatchMode,
  type BacklogBatchPlan,
  type BacklogBatchReport,
} from "./backlog-batch-importer"

const PROGRAM_KEY = "program:matriz-v1"
const IMPORTER_KEY = "matriz-program-v1-02"
const PRODUCT_FLOW = ["discovery", "refined", "ready", "in_progress", "validation", "completed"] as const

const waves = [
  { ordinal: 1, phaseTitle: "Onda 1 — Contenção e governança", initiativeTitle: "Programa Matriz — Onda 1" },
  { ordinal: 2, phaseTitle: "Onda 2 — Banco central e identidade", initiativeTitle: "Programa Matriz — Onda 2" },
  { ordinal: 3, phaseTitle: "Onda 3 — Integração distribuída", initiativeTitle: "Programa Matriz — Onda 3" },
  { ordinal: 4, phaseTitle: "Onda 4 — Seumei offline desktop e PWA", initiativeTitle: "Programa Matriz — Onda 4" },
  { ordinal: 5, phaseTitle: "Onda 5 — Produtos e hardening institucional", initiativeTitle: "Programa Matriz — Onda 5" },
] as const

export interface MatrizProgramMaterializationReport {
  mode: BacklogBatchMode
  backlog: BacklogBatchReport
  roadmap: {
    changed: boolean
    wouldChange: boolean
    phases: number
    initiatives: number
    backlogReferences: number
    scorePreserved: boolean
  }
}

export interface MatrizProgramVerificationReport {
  valid: boolean
  workItems: {
    total: number
    legacyV1: number
    generatedV2: number
    titleCollisions: number
  }
  roadmap: {
    phases: number
    initiatives: number
    backlogReferences: number
    referencesPerInitiative: number[]
  }
  score: {
    legacyGoals: number
    scorecards: number
    points: number
  }
  completedKeys: string[]
  discoveryKeys: string[]
  generatedIdsByKey: Record<string, string>
}

function normalizedTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US")
}

function stableUuid(seed: string): string {
  const digest = createHash("sha256").update(seed).digest("hex")
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`
}

function programPhaseId(plan: BacklogBatchPlan, wave: number): string {
  return `phase_${stableUuid(`${plan.batchId}:phase:${wave}`)}`
}

function programInitiativeId(plan: BacklogBatchPlan, wave: number): string {
  return `ini_${stableUuid(`${plan.batchId}:initiative:${wave}`)}`
}

async function importedItemsByTitle(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
): Promise<{ allItems: WorkItem[]; byKey: Map<string, WorkItem> }> {
  const allItems = await repository.listWorkItems(plan.projectId)
  const byTitle = new Map<string, WorkItem[]>()
  for (const item of allItems) {
    const title = normalizedTitle(item.title)
    byTitle.set(title, [...(byTitle.get(title) ?? []), item])
  }
  const byKey = new Map<string, WorkItem>()
  for (const candidate of plan.items) {
    const matches = byTitle.get(normalizedTitle(candidate.title)) ?? []
    if (matches.length !== 1 || !matches[0].id.startsWith("wi_")) {
      throw new WorkspaceError(`Não foi possível resolver ${candidate.key} para um WorkItem V2 único.`, "CONFLICT")
    }
    byKey.set(candidate.key, matches[0])
  }
  return { allItems, byKey }
}

function importedItemsByReceipt(
  allItems: WorkItem[],
  plan: BacklogBatchPlan,
  receipt: BacklogBatchReceipt | undefined,
): { byKey: Map<string, WorkItem>; valid: boolean } {
  const allById = new Map(allItems.map((item) => [item.id, item]))
  const byKey = new Map<string, WorkItem>()
  const receivedIds = new Set<string>()
  let valid = Boolean(receipt)
  for (const candidate of plan.items) {
    const entry = receipt?.entries[candidate.key]
    if (!entry || entry.state !== "created" || !entry.completed || receivedIds.has(entry.workItemId)) {
      valid = false
      continue
    }
    receivedIds.add(entry.workItemId)
    const item = allById.get(entry.workItemId)
    if (!item) {
      valid = false
      continue
    }
    const acceptanceCriterionIds = item.acceptanceCriteria.map((criterion) => criterion.id)
    if (!entry.acceptanceCriterionIds ||
      JSON.stringify(entry.acceptanceCriterionIds) !== JSON.stringify(acceptanceCriterionIds)) {
      valid = false
      continue
    }
    byKey.set(candidate.key, item)
  }
  return { byKey, valid: valid && byKey.size === plan.items.length && receivedIds.size === plan.items.length }
}

function desiredProgramPhases(plan: BacklogBatchPlan, byKey: Map<string, WorkItem>): Roadmap["phases"] {
  return waves.map((wave, index) => {
    const waveItems = plan.items.slice(index * 10, index * 10 + 10)
    const outcome = waveItems[0]
    return {
      id: programPhaseId(plan, wave.ordinal),
      title: wave.phaseTitle,
      outcome: outcome.acceptanceCriteria[0] ?? "",
      status: "planned" as const,
      initiatives: [{
        id: programInitiativeId(plan, wave.ordinal),
        title: wave.initiativeTitle,
        outcome: outcome.acceptanceCriteria[0] ?? "",
        status: "planned" as const,
        backlogIds: waveItems.map((item) => byKey.get(item.key)!.id),
      }],
    }
  })
}

function assertNoRoadmapTitleCollision(roadmap: Roadmap, plan: BacklogBatchPlan): void {
  const programPhaseIds = new Set(waves.map((wave) => programPhaseId(plan, wave.ordinal)))
  const phaseTitles = new Set(waves.map((wave) => normalizedTitle(wave.phaseTitle)))
  const initiativeTitles = new Set(waves.map((wave) => normalizedTitle(wave.initiativeTitle)))
  for (const phase of roadmap.phases) {
    if (programPhaseIds.has(phase.id)) continue
    if (phaseTitles.has(normalizedTitle(phase.title))) {
      throw new WorkspaceError("Uma fase existente colide com o programa Matriz.", "CONFLICT")
    }
    if (phase.initiatives.some((initiative) => initiativeTitles.has(normalizedTitle(initiative.title)))) {
      throw new WorkspaceError("Uma iniciativa existente colide com o programa Matriz.", "CONFLICT")
    }
  }
}

function reconciledPhases(
  roadmap: Roadmap,
  plan: BacklogBatchPlan,
  desired: Roadmap["phases"],
): Roadmap["phases"] {
  assertNoRoadmapTitleCollision(roadmap, plan)
  const desiredById = new Map(desired.map((phase) => [phase.id, phase]))
  const programIds = new Set(desiredById.keys())
  for (const phase of roadmap.phases) {
    if (!programIds.has(phase.id)) continue
    if (JSON.stringify(phase) !== JSON.stringify(desiredById.get(phase.id))) {
      throw new WorkspaceError("Uma fase materializada divergiu do programa canônico.", "CONFLICT")
    }
  }
  return [
    ...roadmap.phases.filter((phase) => !programIds.has(phase.id)),
    ...desired,
  ]
}

function scoreMeaning(roadmap: Roadmap): string {
  return JSON.stringify({ goals: roadmap.goals, scorecards: roadmap.scorecards })
}

function scoreFingerprint(roadmap: Roadmap): string {
  return createHash("sha256").update(scoreMeaning(roadmap)).digest("hex")
}

export async function materializeMatrizProgram(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
  mode: BacklogBatchMode,
): Promise<MatrizProgramMaterializationReport> {
  const roadmapBefore = await repository.getRoadmap(plan.projectId)
  assertNoRoadmapTitleCollision(roadmapBefore, plan)
  const scoreBefore = scoreMeaning(roadmapBefore)
  const baselineScoreFingerprint = scoreFingerprint(roadmapBefore)
  const receiptBefore = await repository.readImportReceipt(plan.projectId, plan.batchId, backlogBatchReceiptSchema)
  if (receiptBefore?.scoreBaselineFingerprint && receiptBefore.scoreBaselineFingerprint !== baselineScoreFingerprint) {
    throw new WorkspaceError("O score divergiu do baseline canônico do programa.", "CONFLICT")
  }
  const backlog = await importBacklogBatch(repository, plan, mode)
  const baseRoadmapReport = {
    changed: false,
    wouldChange: true,
    phases: 5,
    initiatives: 5,
    backlogReferences: 50,
    scorePreserved: true,
  }

  if (mode === "dry-run") {
    const matchingItems = (await repository.listWorkItems(plan.projectId))
      .filter((item) => plan.items.some((candidate) => normalizedTitle(candidate.title) === normalizedTitle(item.title)))
    if (matchingItems.length !== plan.items.length) {
      return { mode, backlog, roadmap: baseRoadmapReport }
    }
    const { byKey } = await importedItemsByTitle(repository, plan)
    const desired = desiredProgramPhases(plan, byKey)
    const next = reconciledPhases(roadmapBefore, plan, desired)
    return {
      mode,
      backlog,
      roadmap: { ...baseRoadmapReport, wouldChange: JSON.stringify(next) !== JSON.stringify(roadmapBefore.phases) },
    }
  }

  if (backlog.failedKeys.length || backlog.skippedKeys.length) {
    return { mode, backlog, roadmap: baseRoadmapReport }
  }

  const importedReceipt = await repository.readImportReceipt(plan.projectId, plan.batchId, backlogBatchReceiptSchema)
  if (!importedReceipt) {
    throw new WorkspaceError("O importador não persistiu o receipt canônico do programa.", "CONFLICT")
  }
  if (!importedReceipt.scoreBaselineFingerprint) {
    importedReceipt.scoreBaselineFingerprint = baselineScoreFingerprint
    await repository.writeImportReceipt(plan.projectId, plan.batchId, importedReceipt)
  }

  const allItems = await repository.listWorkItems(plan.projectId)
  const resolved = importedItemsByReceipt(allItems, plan, importedReceipt)
  if (!resolved.valid) {
    throw new WorkspaceError("O receipt do programa não resolve os 50 WorkItems canônicos.", "CONFLICT")
  }
  const { byKey } = resolved
  const desired = desiredProgramPhases(plan, byKey)
  const currentRoadmap = await repository.getRoadmap(plan.projectId)
  if (scoreMeaning(currentRoadmap) !== scoreBefore) {
    throw new WorkspaceError("O score mudou durante a importação do programa.", "CONFLICT")
  }
  const nextPhases = reconciledPhases(currentRoadmap, plan, desired)
  const wouldChange = JSON.stringify(nextPhases) !== JSON.stringify(currentRoadmap.phases)
  const finalRoadmap = wouldChange
    ? await repository.updateRoadmap(
      plan.projectId,
      nextPhases,
      currentRoadmap.revision,
      "human",
      {
        action: "matriz_program.roadmap_materialized",
        summary: "Cinco ondas e iniciativas do programa Matriz foram materializadas.",
        entityId: plan.batchId,
      },
    )
    : currentRoadmap
  if (scoreMeaning(finalRoadmap) !== scoreBefore) {
    throw new WorkspaceError("A reconciliação do roadmap alterou o score.", "CONFLICT")
  }

  return {
    mode,
    backlog,
    roadmap: { ...baseRoadmapReport, changed: wouldChange, wouldChange },
  }
}

async function inspectMatrizProgram(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
  allowImporterProgress: boolean,
): Promise<MatrizProgramVerificationReport> {
  const receipt = await repository.readImportReceipt(plan.projectId, plan.batchId, backlogBatchReceiptSchema)
    .catch((error: unknown) => {
      if (error instanceof WorkspaceError && error.code === "INVALID_DATA") return undefined
      throw error
    })
  const receiptKeys = Object.keys(receipt?.entries ?? {}).sort()
  const planKeys = plan.items.map((item) => item.key).sort()
  const receiptKeysValid = receiptKeys.length === 50 &&
    receiptKeys.every((key, index) => key === planKeys[index])
  const allItems = await repository.listWorkItems(plan.projectId)
  const resolved = importedItemsByReceipt(allItems, plan, receipt)
  const { byKey } = resolved
  const roadmap = await repository.getRoadmap(plan.projectId)
  const desiredPhases = resolved.valid ? desiredProgramPhases(plan, byKey) : []
  const normalizedTitles = allItems.map((item) => normalizedTitle(item.title))
  const titleCollisions = normalizedTitles.length - new Set(normalizedTitles).size
  const completedKeys: string[] = []
  const discoveryKeys: string[] = []
  let itemShapesValid = true
  for (const candidate of plan.items) {
    const item = byKey.get(candidate.key)
    if (!item) {
      itemShapesValid = false
      continue
    }
    const expectedParentId = candidate.parentKey ? byKey.get(candidate.parentKey)?.id : undefined
    const expectedDependencyIds = candidate.dependencies.map((key) => byKey.get(key)?.id)
    const isImporter = candidate.key === IMPORTER_KEY
    const isCompletedImporter = candidate.key === IMPORTER_KEY && item.productStatus === "completed"
    const defaultValidation = candidate.kind === "task" ? "not_required" : "pending"
    const criterionCompleted = item.acceptanceCriteria[0]?.completed ?? false
    const defaultLifecycle = item.productStatus === "discovery" &&
      !criterionCompleted && item.validationStatus === defaultValidation
    const completedLifecycle = isCompletedImporter && criterionCompleted && item.validationStatus === "passed"
    const resumableLifecycle = allowImporterProgress && isImporter &&
      PRODUCT_FLOW.includes(item.productStatus as typeof PRODUCT_FLOW[number]) &&
      (item.productStatus === "discovery"
        ? defaultLifecycle || (criterionCompleted && item.validationStatus === "passed")
        : criterionCompleted && item.validationStatus === "passed")
    if (item.productStatus === "completed") completedKeys.push(candidate.key)
    if (item.productStatus === "discovery") discoveryKeys.push(candidate.key)
    itemShapesValid = itemShapesValid &&
      item.kind === candidate.kind &&
      item.projectId === plan.projectId &&
      normalizedTitle(item.title) === normalizedTitle(candidate.title) &&
      item.description === candidate.description &&
      item.priority === candidate.priority &&
      item.domain === candidate.domain &&
      item.responsible === candidate.responsible &&
      item.parentId === expectedParentId &&
      JSON.stringify(item.originRef) === JSON.stringify(candidate.originRef) &&
      JSON.stringify(item.workScope) === JSON.stringify({ kind: "project" }) &&
      JSON.stringify(item.dependencyIds) === JSON.stringify(expectedDependencyIds) &&
      JSON.stringify(item.tags) === JSON.stringify(candidate.tags) &&
      JSON.stringify(item.references) === JSON.stringify(candidate.references) &&
      item.acceptanceCriteria.length === 1 &&
      item.acceptanceCriteria[0].text === candidate.acceptanceCriteria[0] &&
      (defaultLifecycle || completedLifecycle || resumableLifecycle) &&
      item.humanReviewStatus === "not_required" &&
      item.documentationStatus === (candidate.kind === "outcome" ? "pending" : "not_required")
  }
  const initiatives = roadmap.phases.flatMap((phase) => phase.initiatives)
  const referencesPerInitiative = initiatives.map((initiative) => initiative.backlogIds.length)
  const generatedIdsByKey = Object.fromEntries(
    plan.items.flatMap((item) => {
      const resolvedItem = byKey.get(item.key)
      return resolvedItem ? [[item.key, resolvedItem.id]] : []
    }),
  )
  const statusShapeValid = completedKeys.length === 0 ||
    (completedKeys.length === 1 && completedKeys[0] === IMPORTER_KEY)
  const roadmapValid = JSON.stringify(roadmap.phases) === JSON.stringify(desiredPhases)
  const scorePoints = [
    ...roadmap.goals,
    ...roadmap.scorecards.flatMap((scorecard) => scorecard.goals),
  ].reduce((total, goal) => total + goal.score, 0)
  const report: MatrizProgramVerificationReport = {
    valid: false,
    workItems: {
      total: allItems.length,
      legacyV1: allItems.filter((item) => item.id.startsWith("tsk_")).length,
      generatedV2: allItems.filter((item) => item.id.startsWith("wi_")).length,
      titleCollisions,
    },
    roadmap: {
      phases: roadmap.phases.length,
      initiatives: initiatives.length,
      backlogReferences: initiatives.reduce((total, initiative) => total + initiative.backlogIds.length, 0),
      referencesPerInitiative,
    },
    score: {
      legacyGoals: roadmap.goals.length,
      scorecards: roadmap.scorecards.length,
      points: scorePoints,
    },
    completedKeys,
    discoveryKeys,
    generatedIdsByKey,
  }
  report.valid = receipt?.batchId === plan.batchId &&
    receipt.projectId === plan.projectId &&
    receipt.planFingerprint === backlogBatchPlanFingerprint(plan) &&
    receipt.scoreBaselineFingerprint === scoreFingerprint(roadmap) &&
    receiptKeysValid &&
    resolved.valid &&
    itemShapesValid && statusShapeValid && roadmapValid &&
    report.workItems.total === 55 &&
    report.workItems.legacyV1 === 5 &&
    report.workItems.generatedV2 === 50 &&
    report.workItems.titleCollisions === 0 &&
    report.roadmap.phases === 5 &&
    report.roadmap.initiatives === 5 &&
    report.roadmap.backlogReferences === 50 &&
    report.roadmap.referencesPerInitiative.every((count) => count === 10)
  return report
}

export async function verifyMatrizProgram(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
): Promise<MatrizProgramVerificationReport> {
  return inspectMatrizProgram(repository, plan, false)
}

export async function completeMatrizProgramImporterItem(
  repository: WorkspaceRepository,
  plan: BacklogBatchPlan,
): Promise<{ key: typeof IMPORTER_KEY; changed: boolean; item: WorkItem }> {
  const verification = await inspectMatrizProgram(repository, plan, true)
  if (!verification.valid || verification.completedKeys.some((key) => key !== IMPORTER_KEY)) {
    throw new WorkspaceError("O programa precisa estar materializado e idempotente antes da conclusão do importador.", "INVALID_DATA")
  }
  const allItems = await repository.listWorkItems(plan.projectId)
  const receipt = await repository.readImportReceipt(plan.projectId, plan.batchId, backlogBatchReceiptSchema)
  const resolved = importedItemsByReceipt(allItems, plan, receipt)
  const itemFromReceipt = resolved.byKey.get(IMPORTER_KEY)
  if (!resolved.valid || !itemFromReceipt) {
    throw new WorkspaceError("O receipt do programa não resolve o item do importador.", "CONFLICT")
  }
  let item = itemFromReceipt
  if (item.productStatus === "completed") return { key: IMPORTER_KEY, changed: false, item }
  const currentIndex = PRODUCT_FLOW.indexOf(item.productStatus as typeof PRODUCT_FLOW[number])
  if (currentIndex < 0) throw new WorkspaceError("O item do importador está fora do fluxo concluível.", "CONFLICT")
  if (item.acceptanceCriteria.some((criterion) => !criterion.completed) || item.validationStatus !== "passed") {
    item = await repository.updateWorkItem(plan.projectId, item.id, {
      acceptanceCriteria: item.acceptanceCriteria.map((criterion) => ({ ...criterion, completed: true })),
      validationStatus: "passed",
    }, item.revision)
  }
  for (const productStatus of PRODUCT_FLOW.slice(currentIndex + 1)) {
    item = await repository.updateWorkItem(plan.projectId, item.id, { productStatus }, item.revision)
  }
  return { key: IMPORTER_KEY, changed: true, item }
}

export const matrizProgramManifestKey = PROGRAM_KEY
