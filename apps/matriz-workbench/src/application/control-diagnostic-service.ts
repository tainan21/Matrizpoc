import type { ControlDiagnosticInput } from "../integration/control/control-contract"
import {
  automaticRepairDecision,
  repairFailureState,
  rerunRequestedState,
  type ControlDiagnostic,
} from "../domain/control-diagnostic"
import { WorkspaceError } from "../domain/errors"
import { ControlDiagnosticRepository } from "../integration/filesystem/control-diagnostic-repository"

type StartRepair = (projectId: string, fingerprint: string) => Promise<void>

export class ControlDiagnosticService {
  constructor(
    private readonly repository: ControlDiagnosticRepository,
    private readonly startRepair: StartRepair,
  ) {}

  async ingest(input: ControlDiagnosticInput) {
    const recorded = await this.repository.record(input)
    if (!recorded.created) return { ...recorded, repairScheduled: false }
    try {
      await this.startRepair(input.projectId, input.fingerprint)
      return { ...recorded, repairScheduled: true }
    } catch {
      return { ...recorded, repairScheduled: false }
    }
  }
}

interface RepairWorkspace {
  createBacklogItem(
    projectId: string,
    input: {
      title: string
      description: string
      priority: "high"
      tags: string[]
      acceptanceCriteria: string[]
      workScope: { kind: "project" }
    },
    actor?: "system",
  ): Promise<{ id: string }>
  createAgentRequest(
    projectId: string,
    backlogItemId: string,
    instructions: string,
  ): Promise<{ id: string; revision: string }>
  claimAgentRequest(
    projectId: string,
    requestId: string,
    input: {
      claimedBy: string
      executionMode: "change"
      intendedFiles: string[]
      intendedSurfaces: string[]
      plannedChecks: string[]
      baseCommit: string
      dirtyPaths: string[]
      acquiredAt: string
      expiresAt: string
    },
    expectedRevision: string,
    observedAt?: string,
  ): Promise<{ id: string; revision: string }>
}

interface CurrentGitObserver {
  observeCurrent(): Promise<{ headCommit: string; dirtyPaths: string[] }>
}

interface AutomatedCodexStarter {
  startAutomatedRepair(
    projectId: string,
    requestId: string,
    expectedRevision: string,
    diagnosticId: string,
  ): Promise<{ revision: string }>
}

function fingerprintFromDiagnosticId(diagnosticId: string): string {
  const match = /^diag_([a-f0-9]{64})$/.exec(diagnosticId)
  if (!match) throw new WorkspaceError("Invalid automated diagnostic", "INVALID_DATA")
  return match[1]
}

export async function requestAutomatedRepairRerun(
  repository: ControlDiagnosticRepository,
  projectId: string,
  diagnosticId: string,
  createLease: () => string,
): Promise<ControlDiagnostic> {
  const fingerprint = fingerprintFromDiagnosticId(diagnosticId)
  const current = await repository.get(projectId, fingerprint)
  const transition = rerunRequestedState(current, createLease())
  return repository.update(projectId, fingerprint, current.revision, (value) => ({
    ...value,
    ...transition,
    cooldownUntil: undefined,
    updatedAt: new Date().toISOString(),
  }))
}

export async function markAutomatedRepairFailed(
  repository: ControlDiagnosticRepository,
  projectId: string,
  diagnosticId: string,
  failedAt = new Date().toISOString(),
): Promise<ControlDiagnostic> {
  const fingerprint = fingerprintFromDiagnosticId(diagnosticId)
  const current = await repository.get(projectId, fingerprint)
  const transition = repairFailureState(current.repairAttempts, failedAt)
  return repository.update(projectId, fingerprint, current.revision, (value) => ({
    ...value,
    ...transition,
    rerunLease: undefined,
    updatedAt: failedAt,
  }))
}

export async function resetBlockedDiagnostic(
  repository: ControlDiagnosticRepository,
  diagnosticId: string,
  resetAt = new Date().toISOString(),
): Promise<ControlDiagnostic> {
  const current = await repository.findById(diagnosticId)
  if (current.state !== "blocked") {
    throw new WorkspaceError("Only a blocked diagnostic can be retried", "CONFLICT")
  }
  return repository.update(
    current.projectId,
    current.fingerprint,
    current.revision,
    (value) => ({
      ...value,
      state: "open",
      repairAttempts: 0,
      agentRequestId: undefined,
      codexRunRevision: undefined,
      cooldownUntil: undefined,
      rerunLease: undefined,
      updatedAt: resetAt,
    }),
  )
}

export class AutomatedRepairCoordinator {
  constructor(
    private readonly diagnostics: ControlDiagnosticRepository,
    private readonly workspace: RepairWorkspace,
    private readonly git: CurrentGitObserver,
    private readonly codex: AutomatedCodexStarter,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async start(projectId: string, fingerprint: string): Promise<ControlDiagnostic> {
    const current = await this.diagnostics.get(projectId, fingerprint)
    if (!["open", "cooling_down"].includes(current.state)) {
      throw new WorkspaceError("Diagnostic is not ready for repair", "CONFLICT")
    }
    if (current.cooldownUntil && Date.parse(current.cooldownUntil) > Date.parse(this.now())) {
      throw new WorkspaceError("Diagnostic repair is cooling down", "RATE_LIMITED")
    }
    const decision = automaticRepairDecision(current.repairAttempts)
    if (!decision.allowed) {
      await this.diagnostics.update(projectId, fingerprint, current.revision, (value) => ({
        ...value,
        state: "blocked",
        updatedAt: this.now(),
      }))
      throw new WorkspaceError("Automatic repair attempt limit reached", "CONFLICT")
    }

    let lifecycle = await this.diagnostics.update(
      projectId,
      fingerprint,
      current.revision,
      (value) => ({
        ...value,
        state: "repairing",
        repairAttempts: decision.nextAttempt,
        cooldownUntil: undefined,
        rerunLease: undefined,
        updatedAt: this.now(),
      }),
    )

    try {
      const title = `Corrigir falha de ${lifecycle.actionId} em ${projectId}`
      const check = `corepack pnpm --filter ./apps/${projectId} ${lifecycle.actionId}`
      const item = await this.workspace.createBacklogItem(projectId, {
        title,
        description: `Reparo operacional automático do diagnóstico ${lifecycle.id}.`,
        priority: "high",
        tags: ["control-diagnostic", "automatic-repair"],
        acceptanceCriteria: [`A ação ${lifecycle.actionId} deve terminar com código zero.`],
        workScope: { kind: "project" },
      }, "system")
      const request = await this.workspace.createAgentRequest(
        projectId,
        item.id,
        [
          `Diagnóstico: ${lifecycle.id}`,
          `Corrija somente a falha da ação declarada ${lifecycle.actionId}.`,
          "Evidência sanitizada:",
          ...lifecycle.latestEvidence,
        ].join("\n"),
      )
      const observedAt = this.now()
      const baseline = await this.git.observeCurrent()
      const claimed = await this.workspace.claimAgentRequest(projectId, request.id, {
        claimedBy: "codex",
        executionMode: "change",
        intendedFiles: [],
        intendedSurfaces: [`apps/${projectId}`],
        plannedChecks: [check],
        baseCommit: baseline.headCommit,
        dirtyPaths: baseline.dirtyPaths,
        acquiredAt: observedAt,
        expiresAt: new Date(Date.parse(observedAt) + 30 * 60_000).toISOString(),
      }, request.revision, observedAt)
      lifecycle = await this.diagnostics.update(
        projectId,
        fingerprint,
        lifecycle.revision,
        (value) => ({ ...value, agentRequestId: claimed.id, updatedAt: this.now() }),
      )
      const run = await this.codex.startAutomatedRepair(
        projectId,
        claimed.id,
        claimed.revision,
        lifecycle.id,
      )
      return this.diagnostics.update(projectId, fingerprint, lifecycle.revision, (value) => ({
        ...value,
        codexRunRevision: run.revision,
        updatedAt: this.now(),
      }))
    } catch (error) {
      await markAutomatedRepairFailed(this.diagnostics, projectId, lifecycle.id, this.now())
      throw error
    }
  }
}

export interface ControlRepairResultInput {
  actionId: "dev" | "lint" | "typecheck" | "test"
  attempt: number
  lease: string
  exitCode: number
  lines: string[]
}

export class ControlRepairQueue {
  constructor(
    private readonly diagnostics: ControlDiagnosticRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async next(): Promise<{
    diagnosticId: string
    projectId: string
    actionId: ControlDiagnostic["actionId"]
    attempt: number
    lease: string
  } | undefined> {
    const diagnostic = await this.diagnostics.claimNextRerun()
    if (!diagnostic?.rerunLease) return undefined
    return {
      diagnosticId: diagnostic.id,
      projectId: diagnostic.projectId,
      actionId: diagnostic.actionId,
      attempt: diagnostic.repairAttempts,
      lease: diagnostic.rerunLease,
    }
  }

  async result(
    diagnosticId: string,
    input: ControlRepairResultInput,
  ): Promise<ControlDiagnostic> {
    const current = await this.diagnostics.findById(diagnosticId)
    if (
      current.state !== "repairing" ||
      !current.rerunLease ||
      current.actionId !== input.actionId ||
      current.repairAttempts !== input.attempt ||
      current.rerunLease !== input.lease
    ) {
      throw new WorkspaceError("Rerun result does not match its lease", "CONFLICT")
    }
    const transition = input.exitCode === 0
      ? { state: "resolved" as const, cooldownUntil: undefined }
      : repairFailureState(current.repairAttempts, this.now())
    return this.diagnostics.update(
      current.projectId,
      current.fingerprint,
      current.revision,
      (value) => ({
        ...value,
        ...transition,
        latestExitCode: input.exitCode,
        latestEvidence: input.lines,
        rerunLease: undefined,
        updatedAt: this.now(),
      }),
    )
  }
}
