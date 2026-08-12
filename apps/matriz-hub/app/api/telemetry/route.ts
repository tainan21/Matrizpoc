import { NextResponse } from "next/server"
import { collectAllTelemetry } from "@matriz/platform-telemetry"
import { bootstrapMatrizHub } from "../../../src/bootstrap"
import { getHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export async function GET(request: Request) {
  try { getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  bootstrapMatrizHub()
  const events = collectAllTelemetry()
  return NextResponse.json({ count: events.length, events }, { headers: { "cache-control": "private, no-store" } })
}
