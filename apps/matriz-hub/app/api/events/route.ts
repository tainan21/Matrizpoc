import { NextResponse } from "next/server"
import { getGlobalEventBus } from "@matriz/integration-events"
import { getDurableHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  let context
  try { context = await getDurableHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const bus = getGlobalEventBus()
  return NextResponse.json({ events: bus.history().filter((event) => event.tenantId === context.session.activeTenantId) }, { headers: { "cache-control": "private, no-store" } })
}
