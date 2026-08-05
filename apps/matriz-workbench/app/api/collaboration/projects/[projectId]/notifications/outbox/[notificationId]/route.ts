import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"
import { NotificationOutboxStore } from "@/src/integration/collaboration/notification-outbox-store"
import { WorkspaceRepository } from "@/src/integration/filesystem/workspace-repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({
  action: z.enum(["retry", "cancel"]),
  expectedRevision: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; notificationId: string }> },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  try {
    const { projectId, notificationId } = await params
    const input = inputSchema.parse(await request.json())
    const repository = await WorkspaceRepository.create()
    const item = await new NotificationOutboxStore(repository.repositoryRoot).updateStatus(
      projectId,
      notificationId,
      input.action,
      input.expectedRevision,
    )
    await repository.appendActivity(projectId, {
      actor: "human",
      action: `notifications.${input.action}`,
      summary: input.action === "retry"
        ? `Notificação ${item.id} recolocada na fila local.`
        : `Notificação ${item.id} cancelada.`,
      entityType: "project",
      entityId: projectId,
    })
    return NextResponse.json(item)
  } catch (error) {
    return apiError(error)
  }
}
