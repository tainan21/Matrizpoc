import { requireSession, type AuthSession } from "@matriz/platform-auth"

export function requireContractsSession(
  session: AuthSession | null | undefined,
): AuthSession {
  return requireSession(session, "contracts")
}
