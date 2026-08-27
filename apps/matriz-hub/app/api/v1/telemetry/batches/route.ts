import { getCoreDb } from "@matriz/platform-db/core"
import { makeTelemetryRepo } from "@matriz/platform-db/core/repositories"
import { assertSafeTelemetryProperties, telemetryEnvelopeSchema } from "@matriz/platform-telemetry"
import { hasValidServiceToken } from "../../../../../src/auth/service-token"

const MAX_BODY_BYTES = 256 * 1024

export async function POST(request: Request) {
  if (!hasValidServiceToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return Response.json({ error: "Batch too large" }, { status: 413 })
  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return Response.json({ error: "Batch too large" }, { status: 413 })
  let value: unknown
  try { value = JSON.parse(raw) } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }) }
  const body = value as { contractVersion?: unknown; events?: unknown }
  if (body.contractVersion !== "v1" || !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 100) {
    return Response.json({ error: "Invalid telemetry batch" }, { status: 400 })
  }
  try {
    const events = body.events.map((item) => {
      const event = telemetryEnvelopeSchema.parse(item)
      assertSafeTelemetryProperties(event.properties)
      const occurredAt = new Date(event.occurredAt)
      if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid occurredAt")
      return { sourceEventId: event.id, tenantId: event.tenantId, appId: event.appId, eventName: event.type, eventVersion: event.version, category: event.category, properties: event.properties, occurredAt }
    })
    await makeTelemetryRepo(getCoreDb()).recordBatch(events)
    return Response.json({ accepted: events.length }, { status: 202 })
  } catch {
    return Response.json({ error: "Invalid telemetry envelope" }, { status: 400 })
  }
}
