import { cookies, headers } from "next/headers"
import { readSessionByToken } from "@matriz/platform-auth/server-db"
import { getCoreDb } from "@matriz/platform-db/core"
import { localE2eBootstrapPath } from "./local-e2e-bootstrap"
import { resolveSession } from "./oidc.server"
import { resolveOpsAccess, type OpsAccess } from "./ops-access"

export const OPS_SESSION_COOKIE = "matriz_ops_session"

function localE2eEnabled() {
  return Boolean(localE2eBootstrapPath({ MATRIZ_RUNTIME_PROFILE: process.env.MATRIZ_RUNTIME_PROFILE, OPS_E2E_ENABLED: process.env.OPS_E2E_ENABLED, OPS_E2E_SESSION_TOKEN: process.env.OPS_E2E_SESSION_TOKEN }))
}

export async function resolveOpsPrincipal(rawToken: string | undefined) {
  if (!localE2eEnabled() || !rawToken) return null
  const session = await readSessionByToken(rawToken)
  if (!session || session.appId !== "matriz-ops" || session.user.status !== "ACTIVE") return null
  const operator = await getCoreDb().platformOperator.findUnique({ where: { userId: session.userId } })
  if (!operator?.active || operator.revokedAt) return null
  return { session, operator }
}

function legacyToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${OPS_SESSION_COOKIE}=`))?.slice(OPS_SESSION_COOKIE.length + 1)
}

export async function resolveOpsRequestAccess(request: Request): Promise<OpsAccess> {
  const legacy = await resolveOpsPrincipal(legacyToken(request))
  if (legacy) return { state: "authorized", principal: legacy }
  let oidc
  try { oidc = await resolveSession(request) } catch (error) {
    if (process.env.NODE_ENV === "production") throw error
    return { state: "anonymous" }
  }
  if (!oidc) return { state: "anonymous" }
  const operator = oidc.context.appId === "matriz-ops" ? await getCoreDb().platformOperator.findUnique({ where: { userId: oidc.context.userId } }) : null
  return resolveOpsAccess(oidc, operator)
}

export async function getOpsPageAccess() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const host = headerStore.get("host") ?? "127.0.0.1"
  const protocol = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")
  return resolveOpsRequestAccess(new Request(`${protocol}://${host}/`, { headers: { cookie: cookieStore.toString() } }))
}

export async function requireOpsPagePrincipal() { const access = await getOpsPageAccess(); return access.state === "authorized" ? access.principal : null }
export async function requireOpsRequestPrincipal(request: Request) { const access = await resolveOpsRequestAccess(request); if (access.state !== "authorized") throw new Error("OPS_UNAUTHORIZED"); return access.principal }
export function requireSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin || origin !== new URL(request.url).origin) throw new Error("OPS_CSRF") }
