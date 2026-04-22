import { NextResponse } from "next/server"
import { mockTenants } from "@matriz/access-tenants"
import { listFlagsForTenant } from "@matriz/platform-config"

export const dynamic = "force-dynamic"

export function GET() {
  const flags = mockTenants.map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    flagsByApp: listFlagsForTenant(tenant.id),
  }))
  return NextResponse.json({ flags })
}
