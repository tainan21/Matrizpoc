/**
 * smoke: packages/platform/auth V1.1 core
 *
 * Guarantees the shared auth package exposes a server-safe public surface and
 * keeps React APIs behind the explicit client entrypoint required by Next.js
 * App Router.
 */
import { describe, it, expect } from "vitest"
import * as authV1 from "@matriz/platform-auth/v1"
import * as authRoot from "@matriz/platform-auth"
import * as authClient from "@matriz/platform-auth/client"

describe("platform-auth V1.1 public surface", () => {
  it("exports the server-safe stable contract from /v1", () => {
    const keys = new Set(Object.keys(authV1))
    for (const required of [
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

  it("keeps React APIs behind the client entrypoint", () => {
    expect(typeof authRoot.createOtpStrategy).toBe("function")
    expect(typeof authRoot.requireSession).toBe("function")
    expect(typeof authClient.AuthProvider).toBe("function")
    expect(typeof authClient.useAuth).toBe("function")
    expect(typeof authClient.AuthGate).toBe("function")
  })

  it("authOk / authErr produce typed results that round-trip", () => {
    const ok = authV1.authOk({ marker: true })
    const err = authV1.authErr<{ marker: boolean }>({
      code: "session-expired",
      message: "nope",
    })
    expect(ok.ok).toBe(true)
    expect(err.ok).toBe(false)
    if (ok.ok) expect(ok.value.marker).toBe(true)
    if (!err.ok) expect(err.error.code).toBe("session-expired")
  })
})
