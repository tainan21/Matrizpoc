import { NextResponse } from "next/server"
import { getGlobalExternalLinkStore } from "@matriz/integration-external-links"
import { getHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  try { getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const store = getGlobalExternalLinkStore()
  return NextResponse.json({ links: store.list() }, { headers: { "cache-control": "private, no-store" } })
}
