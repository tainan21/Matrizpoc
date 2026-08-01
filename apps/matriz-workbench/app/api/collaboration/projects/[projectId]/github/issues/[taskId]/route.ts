import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildGitHubIssueDraft } from "../../../../../../../../src/application/collaboration/github-issue-draft"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"
import { WorkspaceError } from "../../../../../../../../src/domain/errors"
import { DeliveryReceiptStore } from "../../../../../../../../src/integration/collaboration/delivery-receipt-store"
import { WorkspaceRepository } from "../../../../../../../../src/integration/filesystem/workspace-repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({
  url: z.string().trim().min(1).max(2_000),
  expectedRevision: z.string().min(8).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  try {
    const { projectId, taskId } = await params
    const input = inputSchema.parse(await request.json())
    const repository = await WorkspaceRepository.create()
    const [project, task] = await Promise.all([
      repository.getProject(projectId),
      repository.getBacklogItem(projectId, taskId),
    ])
    if (["done", "archived"].includes(task.status)) {
      throw new WorkspaceError(
        "Tarefas concluídas ou arquivadas não podem receber nova publicação.",
        "INVALID_DATA",
      )
    }
    const draft = buildGitHubIssueDraft(project, task)
    const receipt = await new DeliveryReceiptStore(repository.repositoryRoot).record({
      projectId,
      taskId,
      idempotencyKey: draft.idempotencyKey,
      url: input.url,
      expectedRevision: input.expectedRevision,
    })
    await repository.appendActivity(projectId, {
      actor: "human",
      action: "delivery.github_issue_recorded",
      summary: `Issue GitHub #${receipt.externalId} vinculada à tarefa.`,
      entityType: "backlog",
      entityId: taskId,
    })
    return NextResponse.json(receipt)
  } catch (error) {
    return apiError(error)
  }
}
