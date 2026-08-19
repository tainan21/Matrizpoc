import { requireSession, type AuthSession } from "@matriz/platform-auth"

export function requireSeumeiSession(
  session: AuthSession | null | undefined,
): AuthSession {
  return requireSession(session, "seumei")
}
