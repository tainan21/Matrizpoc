import type { NotificationEvent } from "../../domain/notification"
import { NotificationOutboxStore } from "../../integration/collaboration/notification-outbox-store"

export interface OptionalNotificationInput {
  projectId: string
  event: NotificationEvent
  idempotencyKey: string
  title: string
  body?: string
  workbenchPath: string
  backlogItemId?: string
  agentRequestId?: string
}

export async function enqueueOptionalNotifications(
  repositoryRoot: string,
  input: OptionalNotificationInput,
): Promise<void> {
  await new NotificationOutboxStore(repositoryRoot).enqueue(input.projectId, input).catch(() => {
    // Collaboration providers must never block the local canonical workflow.
  })
}
