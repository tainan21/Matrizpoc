import { NextResponse } from "next/server"
import { listFlagsForTenant } from "@matriz/platform-config"
import { getDurableHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const context = await getDurableHubRequestContext(request)
    return NextResponse.json({ flags: [{ tenantId: context.session.activeTenantId, flagsByApp: listFlagsForTenant(context.session.activeTenantId) }] }, { headers: { "cache-control": "private, no-store" } })
  } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
}
