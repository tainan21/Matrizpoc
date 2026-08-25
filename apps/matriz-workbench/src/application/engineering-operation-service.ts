import type { AgentRequest, ActivityEvent } from "../domain/schemas"
import {
  buildExecutionClaim,
  findOwnershipConflicts,
  type ExecutionClaim,
  type ExecutionMode,
  type OwnershipConflict,
} from "../domain/engineering-operation"
import { WorkspaceError } from "../domain/errors"

interface OperationRepository {
  listActiveExecutionClaims(): Promise<Array<{
    projectId: string
    requestId: string
    status: AgentRequest["status"]
    claim: ExecutionClaim
  }>>
  claimAgentRequest(
    projectId: string,
    requestId: string,
    input: {
      claimedBy: string
      executionMode: ExecutionMode
      intendedFiles: readonly string[]
      intendedSurfaces: readonly string[]
      plannedChecks: readonly string[]
      baseCommit: string
      dirtyPaths: readonly string[]
      acquiredAt: string
      expiresAt: string
    },
    expectedRevision: string,
    observedAt?: string,
  ): Promise<AgentRequest>
  renewAgentRequestClaim(
    projectId: string,
    requestId: string,
    expectedRevision: string,
    expectedGeneration: number,
    renewedAt: string,
    expiresAt: string,
    checkpointSummary: string,
    actor?: ActivityEvent["actor"],
  ): Promise<AgentRequest>
  getAgentRequest(projectId: string, requestId: string): Promise<AgentRequest>
  updateAgentRequest(
    projectId: string,
    requestId: string,
    patch: Partial<Pick<AgentRequest, "status" | "resultSummary" | "changedFiles" | "checks">>,
    expectedRevision: string,
    actor?: ActivityEvent["actor"],
  ): Promise<AgentRequest>
}

interface CurrentGitObserver {
  observeCurrent(): Promise<{ headCommit: string; dirtyPaths: string[] }>
}

export interface ClaimOperationInput {
  projectId: string
  requestId: string
  revision: string
  claimedBy: string
  executionMode: ExecutionMode
  intendedFiles: string[]
  intendedSurfaces: string[]
  plannedChecks: string[]
  leaseMinutes?: number
}

export class EngineeringOperationService {
  constructor(
    private readonly repository: OperationRepository,
    private readonly git: CurrentGitObserver,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async claim(input: ClaimOperationInput): Promise<AgentRequest> {
    const leaseMinutes = input.leaseMinutes ?? 30
    if (!Number.isInteger(leaseMinutes) || leaseMinutes < 5 || leaseMinutes > 120) {
      throw new WorkspaceError("A lease deve durar entre 5 e 120 minutos.", "INVALID_DATA")
    }
    const acquiredAt = this.now()
    const expiresAt = new Date(Date.parse(acquiredAt) + leaseMinutes * 60_000).toISOString()
    const baseline = await this.git.observeCurrent()
    return this.repository.claimAgentRequest(input.projectId, input.requestId, {
      claimedBy: input.claimedBy,
      executionMode: input.executionMode,
      intendedFiles: input.intendedFiles,
      intendedSurfaces: input.intendedSurfaces,
      plannedChecks: input.plannedChecks,
      baseCommit: baseline.headCommit,
      dirtyPaths: baseline.dirtyPaths,
      acquiredAt,
      expiresAt,
    }, input.revision, acquiredAt)
  }

  async checkConflicts(input: ClaimOperationInput): Promise<{
    baseline: { headCommit: string; dirtyPaths: string[] }
    conflicts: OwnershipConflict[]
  }> {
    const leaseMinutes = input.leaseMinutes ?? 30
    if (!Number.isInteger(leaseMinutes) || leaseMinutes < 5 || leaseMinutes > 120) {
      throw new WorkspaceError("A lease deve durar entre 5 e 120 minutos.", "INVALID_DATA")
    }
    const acquiredAt = this.now()
    const expiresAt = new Date(Date.parse(acquiredAt) + leaseMinutes * 60_000).toISOString()
    const baseline = await this.git.observeCurrent()
    const candidate = buildExecutionClaim({
      requestId: input.requestId,
      claimedBy: input.claimedBy,
      executionMode: input.executionMode,
      intendedFiles: input.intendedFiles,
      intendedSurfaces: input.intendedSurfaces,
      plannedChecks: input.plannedChecks,
      baseCommit: baseline.headCommit,
      dirtyPaths: baseline.dirtyPaths,
      acquiredAt,
      expiresAt,
    })
    const active = await this.repository.listActiveExecutionClaims()
    return {
      baseline,
      conflicts: findOwnershipConflicts(candidate, active.map((entry) => entry.claim), acquiredAt),
    }
  }

  async checkpoint(input: {
    projectId: string
    requestId: string
    revision: string
    leaseGeneration: number
    summary: string
    leaseMinutes?: number
  }): Promise<AgentRequest> {
    const leaseMinutes = input.leaseMinutes ?? 30
    if (!Number.isInteger(leaseMinutes) || leaseMinutes < 5 || leaseMinutes > 120) {
      throw new WorkspaceError("A lease deve durar entre 5 e 120 minutos.", "INVALID_DATA")
    }
    const renewedAt = this.now()
    const expiresAt = new Date(Date.parse(renewedAt) + leaseMinutes * 60_000).toISOString()
    return this.repository.renewAgentRequestClaim(
      input.projectId,
      input.requestId,
      input.revision,
      input.leaseGeneration,
      renewedAt,
      expiresAt,
      input.summary,
      "codex",
    )
  }

  async interrupt(input: {
    projectId: string
    requestId: string
    revision: string
    summary: string
    changedFiles?: string[]
    checks?: string[]
  }): Promise<AgentRequest> {
    return this.repository.updateAgentRequest(input.projectId, input.requestId, {
      status: "interrupted",
      resultSummary: input.summary,
      changedFiles: input.changedFiles ?? [],
      checks: input.checks ?? [],
    }, input.revision, "codex")
  }

  async recordResult(input: {
    projectId: string
    requestId: string
    revision: string
    resultSummary: string
    changedFiles: string[]
    checks: string[]
  }): Promise<AgentRequest> {
    return this.repository.updateAgentRequest(input.projectId, input.requestId, {
      status: "completed",
      resultSummary: input.resultSummary,
      changedFiles: input.changedFiles,
      checks: input.checks,
    }, input.revision, "codex")
  }
}
