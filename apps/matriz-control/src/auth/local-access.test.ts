import { describe, expect, it } from "vitest"
import { createSessionValue, isConfiguredToken, verifySessionValue } from "./local-access"

describe("Control local access", () => {
  it("requires a meaningful local token", () => {
    expect(isConfiguredToken(undefined)).toBe(false)
    expect(isConfiguredToken("short")).toBe(false)
    expect(isConfiguredToken("matriz-control-local-token")).toBe(true)
  })

  it("derives a cookie value without storing the raw token", async () => {
    const token = "matriz-control-local-token"
    const session = await createSessionValue(token)
    expect(session).not.toContain(token)
    expect(verifySessionValue(token, session)).toBe(true)
    expect(verifySessionValue("another-control-token", session)).toBe(false)
  })
})
