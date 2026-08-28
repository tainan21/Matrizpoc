import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"
import { getCoreDb } from "@matriz/platform-db/core"
import { hasValidServiceToken } from "../../../../../src/auth/service-token"
import { summarizePersistentTelemetry } from "../../../../../src/domains/telemetry/persistent-summary"

export async function GET(request: Request) {
  if (!hasValidServiceToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const rows = await getCoreDb().telemetryRecord.findMany({
    where: { occurredAt: { gte: since } },
    select: { appId: true, eventName: true, occurredAt: true, properties: true },
    orderBy: { occurredAt: "desc" },
  })
  return Response.json(summarizePersistentTelemetry(rows, MATRIZ_APP_IDS))
}
