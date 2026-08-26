import { CONTROL_HOST_HEALTH_MESSAGE, controlHostHealthSchema, type ControlHostHealthDTO } from "@matriz/integration-api-contracts"

const controlOrigins = new Set(["http://127.0.0.1:3008", "http://localhost:3008"])

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
