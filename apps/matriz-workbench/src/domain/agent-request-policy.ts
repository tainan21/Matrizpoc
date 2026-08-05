import type { AgentRequest } from "./schemas"
import { WorkspaceError } from "./errors"

const ALLOWED_TRANSITIONS: Readonly<
  Record<AgentRequest["status"], readonly AgentRequest["status"][]>
> = {
  queued: ["claimed", "cancelled"],
  claimed: ["in_progress", "blocked", "completed", "cancelled"],
  in_progress: ["blocked", "completed", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
}

export function assertAgentRequestTransition(
  current: AgentRequest,
  nextStatus: AgentRequest["status"],
): void {
  if (current.status === nextStatus) return
  if (!ALLOWED_TRANSITIONS[current.status].includes(nextStatus)) {
    throw new WorkspaceError(
      `Transição inválida de ${current.status} para ${nextStatus}.`,
      "INVALID_DATA",
    )
  }
}

export function assertAgentRequestCompletion(
  current: AgentRequest,
  input: {
    resultSummary?: string
    changedFiles?: readonly string[]
    checks?: readonly string[]
  },
): void {
  if (!current.claimedBy) {
    throw new WorkspaceError(
      "A solicitação precisa ser atribuída antes da conclusão.",
      "INVALID_DATA",
    )
  }
  if (!input.resultSummary?.trim()) {
    throw new WorkspaceError("A conclusão exige um resumo.", "INVALID_DATA")
  }
  if (!input.checks?.length) {
    throw new WorkspaceError(
      "A conclusão exige ao menos uma verificação executada.",
      "INVALID_DATA",
    )
  }
  for (const file of input.changedFiles ?? []) {
    if (
      !file.trim() ||
      file.includes("\0") ||
      file.split(/[\\/]/).includes("..") ||
      /^[a-zA-Z]:[\\/]/.test(file) ||
      file.startsWith("/") ||
      file.startsWith("\\")
    ) {
      throw new WorkspaceError(
        "Arquivos alterados devem usar caminhos relativos ao repositório.",
        "INVALID_PATH",
      )
    }
  }
}
