import { resolveWorkbenchRuntimeMode } from "../../../../src/auth/runtime-mode"
import { authorizeControlRequest } from "../../../../src/integration/control/capability-auth"
import { buildControlHealth } from "../../../../src/integration/control/control-contract"

export const dynamic = "force-dynamic"

export function GET(request: Request): Response {
  const denied = authorizeControlRequest(request)
  if (denied) return denied
  return Response.json(buildControlHealth(resolveWorkbenchRuntimeMode()), {
    headers: { "Cache-Control": "no-store" },
  })
}
