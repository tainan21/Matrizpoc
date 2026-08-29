import { NextResponse } from "next/server"
import { getGlobalExternalLinkStore } from "@matriz/integration-external-links"
import { getDurableHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  let context
  try { context = await getDurableHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const store = getGlobalExternalLinkStore()
  return NextResponse.json({ links: store.listByTenant(context.session.activeTenantId) }, { headers: { "cache-control": "private, no-store" } })
}
