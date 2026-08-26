import { CONTROL_HOST_HEALTH_MESSAGE, controlHostHealthSchema, type ControlHostHealthDTO } from "@matriz/integration-api-contracts"
import { monorepoConfig } from "@matriz/platform-config"

const controlBaseUrl = new URL(monorepoConfig.baseUrls["matriz-control"])
const controlLoopbackAlias = new URL(controlBaseUrl)
controlLoopbackAlias.hostname = controlBaseUrl.hostname === "localhost" ? "127.0.0.1" : "localhost"
const controlOrigins = new Set([controlBaseUrl.origin, controlLoopbackAlias.origin])

interface ControlHostHealthMessageEvent {
  readonly origin: string
  readonly source: unknown
  readonly data: unknown
}

export function readControlHostHealthMessage(event: ControlHostHealthMessageEvent, parentWindow: unknown): ControlHostHealthDTO | null {
  if (event.source !== parentWindow || !controlOrigins.has(event.origin) || !event.data || typeof event.data !== "object") return null
  const message = event.data as { type?: unknown; payload?: unknown }
  if (message.type !== CONTROL_HOST_HEALTH_MESSAGE) return null
  const payload = controlHostHealthSchema.safeParse(message.payload)
  return payload.success ? payload.data : null
}
