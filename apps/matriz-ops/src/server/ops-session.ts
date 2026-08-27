import { cookies } from "next/headers"
import { readSessionByToken } from "@matriz/platform-auth/server-db"
import { getCoreDb } from "@matriz/platform-db/core"

export const OPS_SESSION_COOKIE = "matriz_ops_session"

export async function resolveOpsPrincipal(rawToken: string | undefined) {
  if (!rawToken) return null
  const session = await readSessionByToken(rawToken)
  if (!session || session.appId !== "matriz-ops" || session.user.status !== "ACTIVE") return null
  const operator = await getCoreDb().platformOperator.findUnique({ where: { userId: session.userId } })
  if (!operator?.active || operator.revokedAt) return null
  return { session, operator }
}

export async function requireOpsPagePrincipal() {
  const store = await cookies()
  return resolveOpsPrincipal(store.get(OPS_SESSION_COOKIE)?.value)
}

export async function requireOpsRequestPrincipal(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${OPS_SESSION_COOKIE}=`))?.slice(OPS_SESSION_COOKIE.length + 1)
  const principal = await resolveOpsPrincipal(token)
  if (!principal) throw new Error("OPS_UNAUTHORIZED")
  return principal
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin || origin !== new URL(request.url).origin) throw new Error("OPS_CSRF")
}
