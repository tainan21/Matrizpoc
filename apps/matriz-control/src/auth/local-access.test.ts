import { describe, expect, it } from "vitest"
import { createSessionValue, isConfiguredToken, verifySessionValue } from "./local-access"

describe("Control local access", () => {
  it("requires a meaningful local token outside local development", () => {
    expect(isConfiguredToken(undefined)).toBe(false)
    expect(isConfiguredToken("short", "production")).toBe(false)
    expect(isConfiguredToken("matriz-control-local-token")).toBe(true)
  })

  it("accepts a short convenience token only in local development", () => {
    const convenienceToken = Buffer.from([49, 50, 51, 52]).toString("utf8")
    expect(isConfiguredToken("dev", "development")).toBe(false)
    expect(isConfiguredToken("dev1", "development")).toBe(false)
    expect(isConfiguredToken(convenienceToken, "development")).toBe(true)
    expect(isConfiguredToken(convenienceToken, "production")).toBe(false)
    expect(isConfiguredToken(convenienceToken, "development", "packaged")).toBe(false)
  })

  it("derives a cookie value without storing the raw token", async () => {
    const token = "matriz-control-local-token"
    const session = await createSessionValue(token)
    expect(session).not.toContain(token)
    expect(verifySessionValue(token, session)).toBe(true)
    expect(verifySessionValue("another-control-token", session)).toBe(false)
  })
})
