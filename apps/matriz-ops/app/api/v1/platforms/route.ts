import { listPlatforms } from "../../../../src/application/user-directory"
import { requireOpsRequestPrincipal } from "../../../../src/server/ops-session"
export async function GET(request: Request) { try { await requireOpsRequestPrincipal(request); return Response.json({ contractVersion: "v1", platforms: await listPlatforms() }) } catch { return Response.json({ error: "OPS_UNAUTHORIZED" }, { status: 401 }) } }
