import { createHash } from "node:crypto"
import type { TerminalSession } from "../domain/terminal"
import type { WorkbenchDiagnosticInput } from "../integration/workbench/workbench-client"

const ansiPattern = /\u001B\[[0-?]*[ -/]*[@-~]/g
const secretPattern = /((?:token|secret|password|api[_-]?key)\s*[=:]\s*)\S+/gi
const workspacePathPattern = /[A-Za-z]:[\\/]Apps[\\/]matriz-infra-hub(?:[\\/])?/gi

function sanitize(line: string): string {
  return line
    .replace(ansiPattern, "")
    .replace(secretPattern, "$1[redacted]")
    .replace(workspacePathPattern, "mih/")
    .replaceAll("\\", "/")
    .trim()
    .slice(0, 500)
}

export function toControlDiagnostic(session: TerminalSession): WorkbenchDiagnosticInput | undefined {
  if (session.status !== "failed" && session.status !== "exited") return undefined
  const exitCode = session.exitCode ?? -1
  if (session.status === "exited" && exitCode === 0) return undefined
  const lines = [...session.lines, session.error ?? ""]
    .map(sanitize)
    .filter(Boolean)
    .slice(-80)
  if (!lines.length) return undefined
  const fingerprintSource = JSON.stringify({
    projectId: session.projectId,
    actionId: session.actionId,
    exitCode,
    lines: lines.slice(-20),
  })
  return {
    projectId: session.projectId,
    actionId: session.actionId,
    sessionId: session.id,
    status: session.status,
    exitCode,
    lines,
    occurredAt: session.startedAt,
    fingerprint: createHash("sha256").update(fingerprintSource).digest("hex"),
  }
}
