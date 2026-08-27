import { NextResponse } from "next/server"
import { getGlobalOnboardingStore } from "@matriz/flows-onboarding"
import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"
import { getHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  let context
  try { context = getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const store = getGlobalOnboardingStore()
  const status = [context.session.activeTenantId].map((tenantId) => {
    const progress = store.load(tenantId)
    const completed = Boolean(progress?.completedAt)
    return {
      tenantId,
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
  return NextResponse.json({ status }, { headers: { "cache-control": "private, no-store" } })
}
