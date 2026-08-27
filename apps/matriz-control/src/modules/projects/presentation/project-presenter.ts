import type { ProjectState } from "../domain/project"
import { redactProjectOutput } from "../domain/redaction"
import type { NativeProjectRecord } from "../integration/atomic-project-store"

const labels: Record<ProjectState, string> = {
  unknown: "Estado desconhecido", inspecting: "Inspecionando", needs_review: "Revisão necessária", ready: "Pronto",
  preparing: "Preparando", starting: "Iniciando", running: "Em execução", degraded: "Degradado",
  stopping: "Parando", stopped: "Parado", blocked: "Bloqueado", failed: "Falhou",
}

export type ProjectActionViewModel = Readonly<{ id: string; label: string; commandPreview: string; cwdLabel: "project-root"; environmentKeys: readonly string[]; ports: readonly number[]; readinessLabel: string; lifecycle: string }>
export type ProjectSessionViewModel = Readonly<{ id: string; actionId: string; state: ProjectState; pid: number | null; ports: readonly number[]; startedAt: string; result: string | null }>
export type ProjectViewModel = Readonly<{
  id: string
  name: string
  stackLabel: string
  trustLabel: string
  state: ProjectState
  stateLabel: string
  attention: "none" | "review" | "blocked" | "failed" | "degraded"
  recipeRevision: string
  prepareActions: readonly ProjectActionViewModel[]
  runActions: readonly ProjectActionViewModel[]
  surfaces: readonly { id: string; label: string; kind: string; healthPath: string | null }[]
  permissions: readonly string[]
  sessions: readonly ProjectSessionViewModel[]
  prepared: boolean
  reconciliationReason: string | null
}>

function actionView(action: NativeProjectRecord["recipe"]["runActions"][number]): ProjectActionViewModel {
  return {
    id: action.id,
    label: action.label,
    commandPreview: [action.executable, ...action.args].join(" "),
    cwdLabel: "project-root",
    environmentKeys: [...action.allowedEnvironmentKeys],
    ports: action.requestedPorts.map((item) => item.port),
    readinessLabel: action.readiness ? `${action.readiness.kind.toUpperCase()} ${action.readiness.path ?? ""}`.trim() : "Sem probe",
    lifecycle: action.lifecycle,
  }
}

export function presentProject(record: NativeProjectRecord): ProjectViewModel {
  const manager = record.recipe.detectors.find((item) => item.kind === "package-manager")?.value
  const attention = record.registration.state === "needs_review" ? "review" : record.registration.state === "blocked" ? "blocked" : record.registration.state === "failed" ? "failed" : record.registration.state === "degraded" ? "degraded" : "none"
  return {
    id: record.registration.id,
    name: record.registration.displayName,
    stackLabel: manager ? `Node · ${manager}` : "Node",
    trustLabel: record.registration.trust === "reviewed" ? "Revisada" : "Não revisada",
    state: record.registration.state,
    stateLabel: labels[record.registration.state],
    attention,
    recipeRevision: record.recipe.revision,
    prepareActions: record.recipe.prepareActions.map(actionView),
    runActions: record.recipe.runActions.map(actionView),
    surfaces: record.recipe.surfaces.map(({ id, label, kind, healthPath }) => ({ id, label, kind, healthPath })),
    permissions: [...record.recipe.permissions],
    sessions: record.sessions.slice(-20).map((session) => ({ id: session.sessionId, actionId: session.actionId, state: session.state, pid: session.pid, ports: [...session.expectedPorts], startedAt: session.startedAt, result: session.result ? redactProjectOutput(session.result) : null })),
    prepared: record.preparationEvidence?.recipeRevision === record.recipe.revision && record.preparationEvidence.exitCode === 0,
    reconciliationReason: record.reconciliation?.reason ?? null,
  }
}
