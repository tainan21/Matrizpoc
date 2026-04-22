/**
 * Spot-local guard wrappers. Centralizing `requireSession` here lets us
 * attach Spot-specific telemetry / error UX later without touching
 * pages. The real guard lives in `@matriz/platform-auth`.
 */
import { requireSession, type AuthSession } from "@matriz/platform-auth"

export function requireSpotSession(
  session: AuthSession | null | undefined,
): AuthSession {
  return requireSession(session, "spot")
}
