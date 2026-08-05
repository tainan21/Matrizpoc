import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"
import { WorkspaceError } from "../../../../../../../../src/domain/errors"
import { DeliveryArtifactStore } from "../../../../../../../../src/integration/collaboration/delivery-artifact-store"
import { WorkspaceRepository } from "../../../../../../../../src/integration/filesystem/workspace-repository"
import { enqueueOptionalNotifications } from "../../../../../../../../src/application/collaboration/notification-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({
  deploymentId: z.string().trim().min(1).max(300),
  url: z.string().trim().min(1).max(2_000),
  environment: z.enum(["preview", "production"]),
  sourceCommit: z.string().regex(/^[0-9a-f]{40}$/i),
  state: z.enum(["queued", "building", "ready", "error", "canceled"]),
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
        "O preview exige uma execução concluída com verificações.",
        "INVALID_DATA",
      )
    }
    const store = new DeliveryArtifactStore(repository.repositoryRoot)
    const pullRequest = await store.readPullRequest(projectId, requestId)
    if (pullRequest && pullRequest.headCommit !== input.sourceCommit.toLowerCase()) {
      throw new WorkspaceError(
        "O commit do preview não corresponde ao pull request registrado.",
        "INVALID_DATA",
      )
    }
    const receipt = await store.recordPreview({
      projectId,
      backlogItemId: agentRequest.backlogItemId,
      requestId,
      deploymentId: input.deploymentId,
      url: input.url,
      environment: input.environment,
      sourceCommit: input.sourceCommit,
      state: input.state,
      expectedRevision: input.expectedRevision,
    })
    await repository.appendActivity(projectId, {
      actor: "human",
      action: "delivery.vercel_preview_recorded",
      summary: `Preview Vercel ${receipt.state} vinculado à execução.`,
      entityType: "agent_request",
      entityId: requestId,
      metadata: { deploymentId: receipt.deploymentId, state: receipt.state },
    })
    if (receipt.state === "ready") {
      await enqueueOptionalNotifications(repository.repositoryRoot, {
        projectId,
        event: "preview_ready",
        idempotencyKey: `preview:${receipt.deploymentId}:ready:${receipt.revision}`,
        title: "Preview pronto para validação",
        body: `O deployment ${receipt.deploymentId} está pronto.`,
        workbenchPath: `/projects/${projectId}/agents/${requestId}`,
        backlogItemId: agentRequest.backlogItemId,
        agentRequestId: requestId,
      })
    }
    return NextResponse.json(receipt)
  } catch (error) {
    return apiError(error)
  }
}
