import { getPayDb } from "@matriz/platform-db/pay"
import { manifest } from "../../../src/manifest/manifest"

export async function GET() {
  try {
    await getPayDb().$queryRaw`SELECT 1`
    return Response.json({ status: "ok", appId: manifest.appId, database: "ok", contractVersion: manifest.contractVersion })
  } catch { return Response.json({ status: "degraded", appId: manifest.appId, database: "unavailable" }, { status: 503 }) }
}
