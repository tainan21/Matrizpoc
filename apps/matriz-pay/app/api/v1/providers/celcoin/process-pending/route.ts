import { processDueProviderEvents } from "../../../../../../src/server/provider-event-service"
import { requireOpsService } from "../../../../../../src/server/service-auth"
export async function POST(request: Request) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  return Response.json({ processed: await processDueProviderEvents() })
}
