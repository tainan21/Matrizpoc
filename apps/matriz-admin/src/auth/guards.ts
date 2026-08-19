import { requireSession, type AuthSession } from "@matriz/platform-auth"

export function requireMatrizAdminSession(
  session: AuthSession | null | undefined,
): AuthSession {
  return requireSession(session, "matriz-admin")
}
