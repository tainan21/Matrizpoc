import { NextResponse } from "next/server"
import { mockTenants } from "@matriz/access-tenants"
import { getGlobalOnboardingStore } from "@matriz/flows-onboarding"
import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"

export const dynamic = "force-dynamic"

export function GET() {
  const store = getGlobalOnboardingStore()
  const status = mockTenants.map((tenant) => {
    const progress = store.load(tenant.id)
    const completed = Boolean(progress?.completedAt)
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      startedAt: progress?.startedAt ?? null,
      completedAt: progress?.completedAt ?? null,
      apps: MATRIZ_APP_IDS.map((appId) => {
        const hasAppPayload = Object.prototype.hasOwnProperty.call(
          progress?.perApp ?? {},
          appId,
        )
        return {
          appId,
          started: hasAppPayload,
          completed,
          completedAt: completed ? (progress?.completedAt ?? null) : null,
        }
      }),
    }
  })
  return NextResponse.json({ status })
}
