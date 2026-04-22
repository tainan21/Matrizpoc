import { requireSession, type AuthSession } from "@matriz/platform-auth"

export function requireHubSession(
  session: AuthSession | null | undefined,
): AuthSession {
  return requireSession(session, "matriz-hub")
}
