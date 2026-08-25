import type { AgentRequest } from "../../domain/schemas"

const checkLabels = {
  planned: "planejado",
  running: "executando",
  passed: "passou",
  failed: "falhou",
  cancelled: "cancelado",
  expired: "expirado",
} as const

const reviewLabels = {
  approved: "aprovada",
  changes_requested: "alterações solicitadas",
} as const

const reconciliationLabels = {
  current: "atual",
  divergent: "divergente",
  unavailable: "indisponível",
} as const

export interface EngineeringOperationViewModel {
  modeLabel: string
  owner: string
  intendedFiles: string[]
  intendedSurfaces: string[]
  plannedChecks: string[]
  preexistingPaths: string[]
  leaseLabel: string
  attempts: Array<{ statusLabel: string }>
  executedChecks: Array<{ name: string; statusLabel: string }>
  humanReviewLabel: string
  reconciliationLabel: string
  findings: Array<{ severity: string; summary: string }>
}

export function toEngineeringOperationViewModel(
  request: AgentRequest,
  run?: {
    attempts: readonly { status: string }[]
    checkExecutions: readonly { name: string; state: keyof typeof checkLabels }[]
  },
  reconciliation?: {
    status: keyof typeof reconciliationLabels
    findings: readonly { severity: string; summary: string }[]
  },
): EngineeringOperationViewModel {
  const claim = request.executionClaim
  return {
    modeLabel: claim?.executionMode === "plan_only" ? "somente planejamento" : claim ? "mudança" : "legado / não declarado",
    owner: claim?.claimedBy ?? request.claimedBy ?? "sem owner",
    intendedFiles: claim?.intendedFiles ?? [],
    intendedSurfaces: claim?.intendedSurfaces ?? [],
    plannedChecks: claim?.plannedChecks ?? [],
    preexistingPaths: claim?.baseGit.dirtyPaths ?? [],
    leaseLabel: claim
      ? `${claim.lease.expiresAt} · geração ${claim.lease.generation}`
      : "sem lease",
    attempts: (run?.attempts ?? []).map((attempt) => ({ statusLabel: attempt.status })),
    executedChecks: (run?.checkExecutions ?? []).map((check) => ({
      name: check.name,
      statusLabel: checkLabels[check.state],
    })),
    humanReviewLabel: request.review ? reviewLabels[request.review.status] : "pendente",
    reconciliationLabel: reconciliation ? reconciliationLabels[reconciliation.status] : "não executada",
    findings: reconciliation?.findings.map(({ severity, summary }) => ({ severity, summary })) ?? [],
  }
}
