import { createHash } from "node:crypto"
import { WorkspaceError } from "./errors"
import { redactSensitiveText } from "./redaction"

export type ExecutionAttemptStatus = "running" | "completed" | "failed" | "interrupted" | "cancelled"

export interface ExecutionAttempt {
  id: string
  requestId: string
  hostId?: string
  threadId: string
  turnId: string
  status: ExecutionAttemptStatus
  startedAt: string
  finishedAt?: string
  error?: string
}

export type CheckState = "planned" | "running" | "passed" | "failed" | "cancelled" | "expired"
export type CheckSource = "app_server" | "codex_report" | "ci" | "human"

export interface CheckExecution {
  id: string
  name: string
  command: string
  state: CheckState
  source: CheckSource
  baseCommit: string
  headCommit?: string
  startedAt?: string
  finishedAt?: string
  exitCode?: number
  outputDigest?: string
  outputExcerpt?: string
}

function instant(value: string, field: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    throw new WorkspaceError(`${field} precisa ser um timestamp ISO válido.`, "INVALID_DATA")
  }
  return parsed
}

export function buildExecutionAttempt(input: Omit<ExecutionAttempt, "status">): ExecutionAttempt {
  if (!/^attempt_[0-9a-f-]{36}$/.test(input.id) || !/^req_[0-9a-f-]{36}$/.test(input.requestId)) {
    throw new WorkspaceError("Identificador de attempt inválido.", "INVALID_DATA")
  }
  if (!input.threadId.trim() || !input.turnId.trim()) {
    throw new WorkspaceError("O attempt exige thread e turn.", "INVALID_DATA")
  }
  instant(input.startedAt, "startedAt")
  return { ...input, threadId: input.threadId.trim(), turnId: input.turnId.trim(), status: "running" }
}

export function finishExecutionAttempt(
  attempt: ExecutionAttempt,
  status: Exclude<ExecutionAttemptStatus, "running">,
  finishedAt: string,
  error?: string,
): ExecutionAttempt {
  if (attempt.status !== "running") {
    throw new WorkspaceError("Um attempt terminal não pode mudar de estado.", "CONFLICT")
  }
  if (instant(finishedAt, "finishedAt") < instant(attempt.startedAt, "startedAt")) {
    throw new WorkspaceError("O término não pode preceder o início.", "INVALID_DATA")
  }
  if (["failed", "interrupted"].includes(status) && !error?.trim()) {
    throw new WorkspaceError("Falha ou interrupção exige diagnóstico.", "INVALID_DATA")
  }
  return {
    ...attempt,
    status,
    finishedAt,
    error: error?.trim(),
  }
}

export function buildCheckExecution(
  input: Omit<CheckExecution, "state">,
): CheckExecution {
  if (!/^check_[0-9a-f-]{36}$/.test(input.id)) {
    throw new WorkspaceError("Identificador de check inválido.", "INVALID_DATA")
  }
  if (!input.name.trim() || !input.command.trim() || !/^[0-9a-f]{40}$/.test(input.baseCommit)) {
    throw new WorkspaceError("O check exige nome, comando e base Git.", "INVALID_DATA")
  }
  return { ...input, name: input.name.trim(), command: input.command.trim(), state: "planned" }
}

export function recordCheckResult(
  check: CheckExecution,
  result: {
    startedAt: string
    finishedAt: string
    exitCode: number
    output: string
    headCommit: string
  },
): CheckExecution {
  if (check.state !== "planned" && check.state !== "running") {
    throw new WorkspaceError("O check já possui resultado terminal.", "CONFLICT")
  }
  if (instant(result.finishedAt, "finishedAt") < instant(result.startedAt, "startedAt")) {
    throw new WorkspaceError("O término do check não pode preceder o início.", "INVALID_DATA")
  }
  if (!Number.isInteger(result.exitCode) || !/^[0-9a-f]{40}$/.test(result.headCommit)) {
    throw new WorkspaceError("O resultado do check é inválido.", "INVALID_DATA")
  }
  const redacted = redactSensitiveText(result.output).slice(0, 4_000)
  return {
    ...check,
    state: result.exitCode === 0 ? "passed" : "failed",
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    exitCode: result.exitCode,
    headCommit: result.headCommit,
    outputDigest: createHash("sha256").update(result.output).digest("hex"),
    outputExcerpt: redacted,
  }
}

export function isCheckExpired(check: CheckExecution, currentHeadCommit: string): boolean {
  return check.state === "passed" && check.headCommit !== currentHeadCommit
}
