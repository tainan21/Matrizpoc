import { WorkspaceError } from "./errors"

export type ExecutionMode = "plan_only" | "change"

export interface ExecutionClaim {
  requestId: string
  claimedBy: string
  executionMode: ExecutionMode
  intendedFiles: string[]
  intendedSurfaces: string[]
  plannedChecks: string[]
  baseGit: {
    commit: string
    dirtyPaths: string[]
    observedAt: string
  }
  lease: {
    acquiredAt: string
    renewedAt: string
    expiresAt: string
    generation: number
  }
}

export interface OwnershipConflict {
  requestId: string
  kind: "file" | "surface"
  value: string
}

interface ClaimInput {
  requestId: string
  claimedBy: string
  executionMode: ExecutionMode
  intendedFiles: readonly string[]
  intendedSurfaces: readonly string[]
  plannedChecks: readonly string[]
  baseCommit: string
  dirtyPaths: readonly string[]
  acquiredAt: string
  expiresAt: string
}

function normalizeRepositoryPath(value: string): string {
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "")
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:\//.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new WorkspaceError("Use caminhos relativos e seguros ao repositório.", "INVALID_PATH")
  }
  return normalized
}

function distinct(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

function parseInstant(value: string, field: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    throw new WorkspaceError(`${field} precisa ser um timestamp ISO válido.`, "INVALID_DATA")
  }
  return parsed
}

export function buildExecutionClaim(input: ClaimInput): ExecutionClaim {
  if (!/^req_[0-9a-f-]{36}$/.test(input.requestId)) {
    throw new WorkspaceError("Identificador de solicitação inválido.", "INVALID_DATA")
  }
  if (!input.claimedBy.trim()) {
    throw new WorkspaceError("Identifique o responsável pela execução.", "INVALID_DATA")
  }
  if (!/^[0-9a-f]{40}$/.test(input.baseCommit)) {
    throw new WorkspaceError("A claim exige o commit Git observado.", "INVALID_DATA")
  }
  const intendedFiles = distinct(input.intendedFiles.map(normalizeRepositoryPath))
  const intendedSurfaces = distinct(input.intendedSurfaces.map((value) => value.trim()).filter(Boolean))
  const plannedChecks = distinct(input.plannedChecks.map((value) => value.trim()).filter(Boolean))
  if (input.executionMode === "change" && !intendedFiles.length && !intendedSurfaces.length) {
    throw new WorkspaceError("Declare ao menos um arquivo ou superfície pretendida.", "INVALID_DATA")
  }
  if (input.executionMode === "change" && !plannedChecks.length) {
    throw new WorkspaceError("Declare as verificações planejadas.", "INVALID_DATA")
  }
  const acquiredAt = parseInstant(input.acquiredAt, "acquiredAt")
  const expiresAt = parseInstant(input.expiresAt, "expiresAt")
  if (expiresAt <= acquiredAt) {
    throw new WorkspaceError("A lease precisa expirar depois de ser adquirida.", "INVALID_DATA")
  }
  return {
    requestId: input.requestId,
    claimedBy: input.claimedBy.trim(),
    executionMode: input.executionMode,
    intendedFiles,
    intendedSurfaces,
    plannedChecks,
    baseGit: {
      commit: input.baseCommit,
      dirtyPaths: distinct(input.dirtyPaths.map(normalizeRepositoryPath)),
      observedAt: input.acquiredAt,
    },
    lease: {
      acquiredAt: input.acquiredAt,
      renewedAt: input.acquiredAt,
      expiresAt: input.expiresAt,
      generation: 1,
    },
  }
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

export function findOwnershipConflicts(
  candidate: ExecutionClaim,
  currentClaims: readonly ExecutionClaim[],
  observedAt = new Date().toISOString(),
): OwnershipConflict[] {
  const instant = parseInstant(observedAt, "observedAt")
  const conflicts: OwnershipConflict[] = []
  for (const current of currentClaims) {
    if (current.requestId === candidate.requestId || Date.parse(current.lease.expiresAt) <= instant) continue
    for (const intendedFile of candidate.intendedFiles) {
      if (current.intendedFiles.some((file) => pathsOverlap(file, intendedFile))) {
        conflicts.push({ requestId: current.requestId, kind: "file", value: intendedFile })
      }
    }
    for (const surface of candidate.intendedSurfaces) {
      if (current.intendedSurfaces.includes(surface)) {
        conflicts.push({ requestId: current.requestId, kind: "surface", value: surface })
      }
    }
  }
  return conflicts
}

export function renewExecutionLease(
  claim: ExecutionClaim,
  expectedGeneration: number,
  renewedAt: string,
  expiresAt: string,
): ExecutionClaim {
  if (claim.lease.generation !== expectedGeneration) {
    throw new WorkspaceError("A geração da lease está desatualizada.", "CONFLICT")
  }
  const renewed = parseInstant(renewedAt, "renewedAt")
  const expires = parseInstant(expiresAt, "expiresAt")
  if (renewed >= Date.parse(claim.lease.expiresAt) || expires <= renewed) {
    throw new WorkspaceError("A lease expirada ou inválida não pode ser renovada.", "CONFLICT")
  }
  return {
    ...claim,
    lease: {
      ...claim.lease,
      renewedAt,
      expiresAt,
      generation: claim.lease.generation + 1,
    },
  }
}

export function assertExecutionResult(input: {
  executionMode: ExecutionMode
  resultSummary: string
  changedFiles: readonly string[]
  executedChecks: readonly unknown[]
}): void {
  if (!input.resultSummary.trim()) {
    throw new WorkspaceError("A conclusão exige um resumo factual.", "INVALID_DATA")
  }
  input.changedFiles.forEach(normalizeRepositoryPath)
  if (input.executionMode === "plan_only") {
    if (input.changedFiles.length || input.executedChecks.length) {
      throw new WorkspaceError("Uma execução plan-only não altera arquivos nem executa checks.", "INVALID_DATA")
    }
    return
  }
  if (!input.executedChecks.length) {
    throw new WorkspaceError("A conclusão exige ao menos uma verificação executada.", "INVALID_DATA")
  }
}
