/**
 * smoke: packages/platform/auth V1.1 core
 *
 * Guarantees the shared auth package exposes the stable surface contract
 * consumed by all five apps and that the helpers round-trip correctly.
 */
import { describe, it, expect } from "vitest"
import * as authV1 from "@matriz/platform-auth/v1"
import * as authRoot from "@matriz/platform-auth"

describe("platform-auth V1.1 — public surface", () => {
  it("exports the full stable contract from /v1", () => {
    const keys = new Set(Object.keys(authV1))
    for (const required of [
      "AuthProvider",
      "AuthContext",
      "useAuth",
      "useSession",
      "useAuthStatus",
      "AuthGate",
      "requireSession",
      "createSession",
      "persistSession",
      "clearSession",
      "restoreSession",
      "refreshSession",
      "createAppSessionStorage",
      "createSessionStorageFrom",
      "toSessionSnapshot",
      "fromSessionSnapshot",
      "createOtpStrategy",
      "createMagicLinkStrategy",
      "authOk",
      "authErr",
      "authError",
    ]) {
      expect(keys.has(required), `missing export: ${required}`).toBe(true)
    }
  })

  it("re-exports v1 from the root barrel (back-compat)", () => {
    expect(typeof authRoot.AuthProvider).toBe("function")
    expect(typeof authRoot.useAuth).toBe("function")
  })

  it("authOk / authErr produce typed results that round-trip", () => {
    const ok = authV1.authOk({ marker: true })
    const err = authV1.authErr<{ marker: boolean }>({ code: "session-expired", message: "nope" })
    expect(ok.ok).toBe(true)
    expect(err.ok).toBe(false)
    if (ok.ok) expect(ok.value.marker).toBe(true)
    if (!err.ok) expect(err.error.code).toBe("session-expired")
  })
})
