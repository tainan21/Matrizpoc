import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"
import { notificationChannelSchema, notificationEventSchema } from "@/src/domain/notification"
import { NotificationOutboxStore } from "@/src/integration/collaboration/notification-outbox-store"
import { WorkspaceRepository } from "@/src/integration/filesystem/workspace-repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({
  enabled: z.boolean(),
  channels: z.array(notificationChannelSchema).max(2),
  events: z.array(notificationEventSchema).max(4),
  redaction: z.object({
    includeSummary: z.boolean(),
    includeFilePaths: z.boolean(),
    includeExternalUrls: z.boolean(),
  }),
  expectedRevision: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  try {
    const { projectId } = await params
    const input = inputSchema.parse(await request.json())
    const repository = await WorkspaceRepository.create()
    await repository.getProject(projectId)
    const config = await new NotificationOutboxStore(repository.repositoryRoot).updateConfig(
      projectId,
      input,
      input.expectedRevision,
    )
    await repository.appendActivity(projectId, {
      actor: "human",
      action: "notifications.config_updated",
      summary: config.enabled
        ? `Notificações locais habilitadas para ${config.channels.join(", ")}.`
        : "Notificações locais desabilitadas.",
      entityType: "project",
      entityId: projectId,
    })
    return NextResponse.json(config)
  } catch (error) {
    return apiError(error)
  }
}
