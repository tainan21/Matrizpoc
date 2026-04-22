/**
 * @matriz/platform-notifications
 *
 * In-app notification types + lightweight in-memory queue. No real transport.
 * Apps consume via their own provider/hook in CP-3+.
 *
 * L12: no app-specific concepts — only a generic "notification" envelope.
 */
import { generateId, nowIso } from "@matriz/foundation-utils"

export const PLATFORM_NOTIFICATIONS_VERSION = "0.1.0" as const

export type NotificationTone = "info" | "success" | "warning" | "danger"

export interface Notification {
  readonly id: string
  readonly tone: NotificationTone
  readonly title: string
  readonly description?: string
  readonly createdAt: string
}

export type NotificationListener = (n: Notification) => void

/** In-process queue. Each app creates its own instance via `createNotificationCenter()`. */
export interface NotificationCenter {
  list(): readonly Notification[]
  notify(
    input: Omit<Notification, "id" | "createdAt"> & { createdAt?: string },
  ): Notification
  subscribe(listener: NotificationListener): () => void
  clear(): void
}

export function createNotificationCenter(): NotificationCenter {
  const items: Notification[] = []
  const listeners = new Set<NotificationListener>()

  return {
    list: () => [...items],
    notify(input) {
      const n: Notification = {
        id: generateId("notif"),
        tone: input.tone,
        title: input.title,
        description: input.description,
        createdAt: input.createdAt ?? nowIso(),
      }
      items.unshift(n)
      for (const l of listeners) l(n)
      return n
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    clear() {
      items.length = 0
    },
  }
}
