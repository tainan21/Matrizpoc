import type { CodexRunSnapshot } from "../../domain/codex-run"
import type { CodexRuntimeInfo } from "../../integration/codex/app-server-client"

export interface CodexRunViewModel {
  status: CodexRunSnapshot["status"]
  connected: boolean
  threadId?: string
  turnId?: string
  latestMessage: string
  plan: CodexRunSnapshot["plan"]
  commands: CodexRunSnapshot["commands"]
  changedFiles: string[]
  checks: string[]
  approvals: CodexRunSnapshot["approvals"]
  diff: string
  error?: string
  startedAt: string
  updatedAt: string
  completedAt?: string
}

export interface CodexRuntimeViewModel {
  available: boolean
  sourceLabel: string
  executable?: string
  reason?: string
}

export function toCodexRunViewModel(
  run: CodexRunSnapshot | undefined,
): CodexRunViewModel | undefined {
  if (!run) return undefined
  return {
    status: run.status,
    connected: run.connected,
    threadId: run.threadId,
    turnId: run.turnId,
    latestMessage: run.latestMessage,
    plan: run.plan,
    commands: run.commands,
    changedFiles: run.changedFiles,
    checks: run.checks,
    approvals: run.approvals,
    diff: run.diff,
    error: run.error,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt,
  }
}

export function toCodexRuntimeViewModel(
  runtime: CodexRuntimeInfo,
): CodexRuntimeViewModel {
  const labels = {
    environment: "WORKBENCH_CODEX_BIN",
    plugin: "Codex App Server",
    desktop: "Codex Desktop",
    path: "PATH",
  }
  return {
    available: runtime.available,
    sourceLabel: runtime.source ? labels[runtime.source] : "indisponível",
    executable: runtime.executable,
    reason: runtime.reason,
  }
}
