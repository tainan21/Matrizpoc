import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"
import { WorkspaceError } from "../../../../../../../../src/domain/errors"
import { DeliveryArtifactStore } from "../../../../../../../../src/integration/collaboration/delivery-artifact-store"
import { WorkspaceRepository } from "../../../../../../../../src/integration/filesystem/workspace-repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({
  url: z.string().trim().min(1).max(2_000),
  baseBranch: z.string().trim().min(1).max(200),
  headBranch: z.string().trim().min(1).max(200),
  headCommit: z.string().regex(/^[0-9a-f]{40}$/i),
  expectedRevision: z.string().min(8).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  try {
    const { projectId, requestId } = await params
    const input = inputSchema.parse(await request.json())
    const repository = await WorkspaceRepository.create()
    const agentRequest = await repository.getAgentRequest(projectId, requestId)
    if (agentRequest.status !== "completed" || !agentRequest.checks.length) {
      throw new WorkspaceError(
        "O pull request exige uma execução concluída com verificações.",
        "INVALID_DATA",
      )
    }
    const receipt = await new DeliveryArtifactStore(repository.repositoryRoot).recordPullRequest({
      projectId,
      backlogItemId: agentRequest.backlogItemId,
      requestId,
      url: input.url,
      baseBranch: input.baseBranch,
      headBranch: input.headBranch,
      headCommit: input.headCommit,
      checks: agentRequest.checks,
      expectedRevision: input.expectedRevision,
    })
    await repository.appendActivity(projectId, {
      actor: "human",
      action: "delivery.github_pull_request_recorded",
      summary: `Pull request GitHub #${receipt.externalId} vinculado à execução.`,
      entityType: "agent_request",
      entityId: requestId,
      metadata: { externalId: receipt.externalId },
    })
    return NextResponse.json(receipt)
  } catch (error) {
    return apiError(error)
  }
}
