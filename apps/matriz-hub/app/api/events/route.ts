import { NextResponse } from "next/server"
import { getGlobalEventBus } from "@matriz/integration-events"
import { getHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  try { getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const bus = getGlobalEventBus()
  return NextResponse.json({ events: bus.history() }, { headers: { "cache-control": "private, no-store" } })
}
