import type { AgentRequest } from "../domain/schemas"
import type { CheckExecution } from "../domain/execution-evidence"
import {
  reconcileExecution,
  type ReconciliationFinding,
} from "../domain/reconciliation"

interface ReconciliationDependencies {
  getRequest(projectId: string, requestId: string): Promise<AgentRequest>
  getRun(projectId: string, requestId: string): Promise<{
    status: "starting" | "running" | "waiting_approval" | "completed" | "failed" | "interrupted"
    revision: string
    threadId?: string
    changedFiles: readonly string[]
    checkExecutions: readonly CheckExecution[]
  } | undefined>
  observeGit(baseCommit: string): Promise<{
    headCommit: string
    changedFiles: readonly string[]
    commits: readonly { id: string; requestIds: readonly string[] }[]
  }>
  observeThread(threadId: string): Promise<{
    available: boolean
    exists: boolean
    status: "active" | "completed" | "failed" | "interrupted" | "cancelled" | "unknown"
  }>
  now(): string
}

export interface ReconciliationSnapshot {
  status: "current" | "divergent" | "unavailable"
  projectId: string
  requestId: string
  requestRevision: string
  runRevision?: string
  observedAt: string
  findings: ReconciliationFinding[]
  diagnostic?: string
  threadObservation?: "available" | "unavailable" | "not_linked"
}

export class ReconciliationService {
  constructor(private readonly dependencies: ReconciliationDependencies) {}

  async reconcile(projectId: string, requestId: string): Promise<ReconciliationSnapshot> {
    const observedAt = this.dependencies.now()
    const request = await this.dependencies.getRequest(projectId, requestId)
    const run = await this.dependencies.getRun(projectId, requestId)
    try {
      const git = await this.dependencies.observeGit(
        request.executionClaim?.baseGit.commit ?? "",
      )
      const thread = run?.threadId
        ? await this.dependencies.observeThread(run.threadId)
        : undefined
      const findings = reconcileExecution({ request, run, git, thread, observedAt })
      return {
        status: findings.length ? "divergent" : "current",
        projectId,
        requestId,
        requestRevision: request.revision,
        runRevision: run?.revision,
        observedAt,
        findings,
        threadObservation: !run?.threadId
          ? "not_linked"
          : thread?.available
            ? "available"
            : "unavailable",
      }
    } catch (error) {
      return {
        status: "unavailable",
        projectId,
        requestId,
        requestRevision: request.revision,
        runRevision: run?.revision,
        observedAt,
        findings: [],
        diagnostic: error instanceof Error ? error.message : "Provider de reconciliação indisponível.",
      }
    }
  }
}
