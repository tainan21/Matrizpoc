/**
 * Imperative guard — use inside Server Actions or custom hooks when you
 * want "assert signed-in OR throw" semantics. For declarative rendering
 * prefer `<AuthGate>`.
 */
import type { AuthSession } from "../types"

export function requireSession(
  session: AuthSession | null | undefined,
  context = "requireSession",
): AuthSession {
  if (!session) {
    throw new Error(`[${context}] No authenticated session available.`)
  }
  return session
}
