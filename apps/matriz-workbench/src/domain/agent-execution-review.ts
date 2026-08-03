import type { ActivityEvent, AgentExecutionReview, AgentRequest } from "./schemas"
import { WorkspaceError } from "./errors"

export function buildAgentExecutionReview(
  request: AgentRequest,
  input: {
    status: AgentExecutionReview["status"]
    reviewedBy: string
    note?: string
    runRevision?: string
  },
  actor: ActivityEvent["actor"],
  reviewedAt = new Date().toISOString(),
): AgentExecutionReview {
  if (actor !== "human") {
    throw new WorkspaceError("Somente uma pessoa pode revisar uma execução.", "INVALID_DATA")
  }
  if (request.status !== "completed") {
    throw new WorkspaceError("A execução precisa estar concluída antes da revisão.", "INVALID_DATA")
  }
  if (!input.reviewedBy.trim()) {
    throw new WorkspaceError("Identifique a pessoa responsável pela revisão.", "INVALID_DATA")
  }
  if (input.status === "approved" && (!request.resultSummary?.trim() || !request.checks.length)) {
    throw new WorkspaceError(
      "Aprovar a execução exige resultado e ao menos uma verificação revisável.",
      "INVALID_DATA",
    )
  }
  if (input.status === "changes_requested" && !input.note?.trim()) {
    throw new WorkspaceError("Solicitar alterações exige uma justificativa.", "INVALID_DATA")
  }
  return {
    status: input.status,
    reviewedBy: input.reviewedBy.trim(),
    reviewedAt,
    note: input.note?.trim() ?? "",
    runRevision: input.runRevision,
  }
}
