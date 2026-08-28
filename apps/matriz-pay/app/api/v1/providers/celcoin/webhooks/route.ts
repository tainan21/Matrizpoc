import { createHash } from "node:crypto"
import { getPayDb } from "@matriz/platform-db/pay"
import { verifyCelcoinWebhookAuthorization } from "../../../../../../src/providers/celcoin/celcoin-adapter"
import { processStoredProviderEvent } from "../../../../../../src/server/provider-event-service"

const MAX_BYTES = 256 * 1024

function nestedString(payload: Record<string, unknown>, names: readonly string[]): string | undefined {
  for (const [key, value] of Object.entries(payload)) {
    if (names.some((name) => name.toLowerCase() === key.toLowerCase()) && (typeof value === "string" || typeof value === "number")) return String(value)
    if (value && typeof value === "object" && !Array.isArray(value)) { const found = nestedString(value as Record<string, unknown>, names); if (found) return found }
  }
  return undefined
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization")
  const expected = process.env.CELCOIN_WEBHOOK_SECRET ?? ""
  if (!verifyCelcoinWebhookAuthorization(authorization, expected)) return Response.json({ error: "Invalid webhook authentication" }, { status: 401 })
  const raw = await request.text()
  if (Buffer.byteLength(raw) > MAX_BYTES) return Response.json({ error: "Payload too large" }, { status: 413 })
  let payload: Record<string, unknown>
  try { payload = JSON.parse(raw) as Record<string, unknown> } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }) }
  const amountToken = raw.match(/"amount"\s*:\s*(-?\d+(?:\.\d+)?)/i)?.[1]
  if (amountToken) payload.amountExact = amountToken.includes(".") ? amountToken : `${amountToken}.00`
  const url = new URL(request.url)
  const providerEventId = request.headers.get("x-celcoin-event-id") ?? nestedString(payload, ["id", "webhookId", "clientCode"]) ?? ""
  const eventType = request.headers.get("x-celcoin-entity") ?? url.searchParams.get("entity") ?? nestedString(payload, ["entity", "movementType", "eventType", "transactionType", "type", "status"]) ?? ""
  if (!providerEventId || !eventType) return Response.json({ error: "Missing provider event identity" }, { status: 400 })
  try {
    const event = await getPayDb().providerEvent.create({ data: {
      provider: "celcoin", providerEventId, eventType, payloadJson: payload as never,
      payloadHash: createHash("sha256").update(raw).digest("hex"),
      signature: createHash("sha256").update(authorization ?? "").digest("hex"),
    } })
    try { await processStoredProviderEvent(event.id) } catch { /* durable retry worker owns subsequent attempts */ }
    return Response.json({ accepted: true }, { status: 202 })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const existing = await getPayDb().providerEvent.findUnique({ where: { provider_providerEventId: { provider: "celcoin", providerEventId } } })
      const hash = createHash("sha256").update(raw).digest("hex")
      if (existing && existing.payloadHash !== hash) return Response.json({ error: "Webhook replay conflict" }, { status: 409 })
      return Response.json({ accepted: true, duplicate: true }, { status: 202 })
    }
    return Response.json({ error: "Webhook inbox unavailable" }, { status: 503 })
  }
}
