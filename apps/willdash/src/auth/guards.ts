import { requireSession, type AuthSession } from "@matriz/platform-auth"

export function requireWilldashSession(
  session: AuthSession | null | undefined,
): AuthSession {
  return requireSession(session, "willdash")
}
