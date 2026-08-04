import { z } from "zod"
import type { AgentRequest } from "./schemas"
import type { CheckExecution } from "./execution-evidence"
import { isCheckExpired } from "./execution-evidence"

export type ReconciliationFindingCode =
  | "run_missing"
  | "thread_missing"
  | "thread_terminal_request_active"
  | "declared_file_not_observed"
  | "observed_file_not_declared"
  | "review_stale"
  | "lease_expired"
  | "check_expired"
  | "commit_unlinked"

export interface ReconciliationFinding {
  code: ReconciliationFindingCode
  severity: "info" | "warning" | "error"
  summary: string
  value?: string
}

export const reconciliationFindingSchema = z.object({
  code: z.enum([
    "run_missing",
    "thread_missing",
    "thread_terminal_request_active",
    "declared_file_not_observed",
    "observed_file_not_declared",
    "review_stale",
    "lease_expired",
    "check_expired",
    "commit_unlinked",
  ]),
  severity: z.enum(["info", "warning", "error"]),
  summary: z.string().trim().min(1).max(1000),
  value: z.string().trim().min(1).max(500).optional(),
})

export const reconciliationRecordSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["current", "divergent", "unavailable"]),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  requestId: z.string().regex(/^req_[0-9a-f-]{36}$/),
  requestRevision: z.string().min(8),
  runRevision: z.string().min(8).optional(),
  observedAt: z.string().datetime(),
  findings: z.array(reconciliationFindingSchema).max(200),
  diagnostic: z.string().max(1000).optional(),
  threadObservation: z.enum(["available", "unavailable", "not_linked"]).optional(),
  revision: z.string().min(8),
})

export type ReconciliationRecord = z.infer<typeof reconciliationRecordSchema>

export interface ReconciliationInput {
  request: AgentRequest
  run?: {
    status: "starting" | "running" | "waiting_approval" | "completed" | "failed" | "interrupted"
    revision: string
    threadId?: string
    changedFiles: readonly string[]
    checkExecutions: readonly CheckExecution[]
  }
  git: {
    headCommit: string
    changedFiles: readonly string[]
    commits: readonly { id: string; requestIds: readonly string[] }[]
  }
  thread?: {
    available: boolean
    exists: boolean
    status: "active" | "completed" | "failed" | "interrupted" | "cancelled" | "unknown"
  }
  observedAt: string
}

const ACTIVE_REQUEST_STATES: AgentRequest["status"][] = ["claimed", "in_progress", "blocked"]
const TERMINAL_THREAD_STATES = new Set(["completed", "failed", "interrupted", "cancelled"])

export function reconcileExecution(input: ReconciliationInput): ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = []
  const { request, run, git, thread } = input
  if (!run && request.status === "completed") {
    findings.push({ code: "run_missing", severity: "error", summary: "Solicitação concluída sem run observável." })
  }
  if (run?.threadId && thread?.available && !thread.exists) {
    findings.push({ code: "thread_missing", severity: "warning", summary: "A thread registrada não está disponível." })
  }
  if (
    ACTIVE_REQUEST_STATES.includes(request.status) &&
    thread?.available &&
    thread.exists &&
    TERMINAL_THREAD_STATES.has(thread.status)
  ) {
    findings.push({
      code: "thread_terminal_request_active",
      severity: "error",
      summary: `A thread está ${thread.status}, mas a solicitação continua ${request.status}.`,
    })
  }
  const observed = new Set(git.changedFiles)
  const declared = new Set([...request.changedFiles, ...(run?.changedFiles ?? [])])
  for (const file of declared) {
    if (!observed.has(file)) {
      findings.push({
        code: "declared_file_not_observed",
        severity: "warning",
        summary: "Arquivo declarado não aparece na observação Git.",
        value: file,
      })
    }
  }
  const preexisting = new Set(request.executionClaim?.baseGit.dirtyPaths ?? [])
  for (const file of observed) {
    if (!declared.has(file) && !preexisting.has(file)) {
      findings.push({
        code: "observed_file_not_declared",
        severity: "error",
        summary: "Arquivo observado no Git não foi declarado pela execução.",
        value: file,
      })
    }
  }
  if (request.review?.runRevision && run && request.review.runRevision !== run.revision) {
    findings.push({
      code: "review_stale",
      severity: "error",
      summary: "A revisão humana aponta para uma revisão anterior do run.",
    })
  }
  if (
    request.executionClaim &&
    ACTIVE_REQUEST_STATES.includes(request.status) &&
    Date.parse(request.executionClaim.lease.expiresAt) <= Date.parse(input.observedAt)
  ) {
    findings.push({
      code: "lease_expired",
      severity: "warning",
      summary: "A ownership lease expirou e exige reconciliação antes de novo claim.",
    })
  }
  for (const check of run?.checkExecutions ?? []) {
    if (isCheckExpired(check, git.headCommit)) {
      findings.push({
        code: "check_expired",
        severity: "warning",
        summary: "Um check aprovado foi executado em outro head Git.",
        value: check.id,
      })
    }
  }
  for (const commit of git.commits) {
    if (!commit.requestIds.includes(request.id)) {
      findings.push({
        code: "commit_unlinked",
        severity: "warning",
        summary: "Commit observado sem trailer para a solicitação canônica.",
        value: commit.id,
      })
    }
  }
  return findings
}
