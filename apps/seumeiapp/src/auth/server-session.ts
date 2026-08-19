import type { AuthSession } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"
import type { SeumeiRequestContext } from "../application/read-home-summary"

interface SessionEnvelope { readonly session?: AuthSession | null }

export async function resolveSeumeiRequestContext(cookie: string): Promise<SeumeiRequestContext | null> {
  const response = await fetch(`${monorepoConfig.baseUrls["matriz-hub"]}/api/auth/mock/session`, {
    headers: cookie ? { cookie } : {},
    cache: "no-store",
  })
  if (!response.ok) return null
  const envelope = await response.json() as SessionEnvelope | null
  const session = envelope?.session
  if (!session) return null
  const tenant = session.identity.tenants.find(({ tenantId }) => tenantId === session.activeTenantId)
  if (!tenant || !tenant.enabledApps.includes("seumei" as never)) return null
  return { tenantId: tenant.tenantId, tenantName: tenant.tenantName, userName: session.identity.user.name }
}
