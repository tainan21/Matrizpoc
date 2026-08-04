import { describe, expect, it } from "vitest"
import { createLoginState, loginFlowReducer, shouldVerifyMagicLink } from "@matriz/flows-auth"

describe("shared login flow state", () => {
  it("preserves email while switching methods", () => {
    const initial = createLoginState("google")
    const withEmail = loginFlowReducer(initial, { type: "email.changed", email: "ana@matriz.com" })
    const switched = loginFlowReducer(withEmail, { type: "method.selected", method: "otp" })
    expect(switched.email).toBe("ana@matriz.com")
    expect(switched.method).toBe("otp")
  })

  it("moves from challenge to idle when the user changes email", () => {
    const initial = createLoginState("magic-link")
    const challenged = loginFlowReducer(initial, {
      type: "challenge.started",
      challenge: { id: "c1", method: "magic-link", email: "ana@matriz.com", expiresAt: "2026-08-04T12:10:00Z", previewUrl: "http://localhost:3000/login?magic_token=x" },
    })
    expect(challenged.phase).toBe("challenge")
    expect(loginFlowReducer(challenged, { type: "challenge.reset" }).phase).toBe("idle")
  })

  it("exposes broker failures as accessible error state", () => {
    const failed = loginFlowReducer(createLoginState("email"), { type: "failed", message: "Hub indisponivel" })
    expect(failed).toMatchObject({ phase: "error", message: "Hub indisponivel" })
  })

  it("waits for provider boot before consuming a magic link", () => {
    expect(shouldVerifyMagicLink("booting", "token", false)).toBe(false)
    expect(shouldVerifyMagicLink("signed-out", "token", false)).toBe(true)
    expect(shouldVerifyMagicLink("signed-in", "token", true)).toBe(false)
  })
})
