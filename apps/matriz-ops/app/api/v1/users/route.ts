import { listUserDirectory } from "../../../../src/application/user-directory"
import { requireOpsRequestPrincipal } from "../../../../src/server/ops-session"

export async function GET(request: Request) {
  try { await requireOpsRequestPrincipal(request) } catch { return Response.json({ error: "OPS_UNAUTHORIZED" }, { status: 401 }) }
  const query = new URL(request.url).searchParams.get("q") ?? ""
  return Response.json({ contractVersion: "v1", users: await listUserDirectory(query) })
}
