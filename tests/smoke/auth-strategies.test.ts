/**
 * smoke: OTP + Magic Link strategies
 *
 * Proves the plugin interface is honored and that start/verify produce
 * AuthIdentity envelopes consumable by AuthProvider.createSession().
 */
import { describe, it, expect } from "vitest"
import { createOtpStrategy, createMagicLinkStrategy } from "@matriz/platform-auth/v1"

describe("auth strategies — OTP", () => {
  it("start returns a hinted code; verify(correct code) issues identity", async () => {
    const otp = createOtpStrategy({ mockCode: "654321" })
    const started = await otp.start({ email: "user@matriz.dev" })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.value.email).toBe("user@matriz.dev")
    expect(started.value.hint).toContain("654321")

    const verified = await otp.verify({ email: "user@matriz.dev", code: "654321" })
    expect(verified.ok).toBe(true)
    if (verified.ok) {
      expect(verified.value.user.email).toBe("user@matriz.dev")
      expect(verified.value.tenants[0]?.enabledApps).toEqual(
        expect.arrayContaining(["matriz-admin", "seumei"]),
      )
    }
  })

  it("verify(wrong code) fails with invalid-credentials", async () => {
    const otp = createOtpStrategy()
    const started = await otp.start({ email: "x@matriz.dev" })
    expect(started.ok).toBe(true)
    const v = await otp.verify({ email: "x@matriz.dev", code: "000000" })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.error.code).toBe("invalid-credentials")
  })

  it("verify without prior start fails with invalid-credentials", async () => {
    const otp = createOtpStrategy()
    const v = await otp.verify({ email: "ghost@matriz.dev", code: "123456" })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.error.code).toBe("invalid-credentials")
  })
})

describe("auth strategies — Magic Link", () => {
  it("start issues a token; verify(token) resolves to identity", async () => {
    const ml = createMagicLinkStrategy()
    const started = await ml.start({ email: "owner@matriz.dev" })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(typeof started.value.token).toBe("string")
    const verified = await ml.verify({ token: started.value.token })
    expect(verified.ok).toBe(true)
    if (verified.ok) {
      expect(verified.value.user.email).toBe("owner@matriz.dev")
      expect(verified.value.tenants[0]?.enabledApps).toEqual(
        expect.arrayContaining(["matriz-admin", "seumei"]),
      )
    }
  })

  it("verify(unknown token) fails with invalid-credentials", async () => {
    const ml = createMagicLinkStrategy()
    const v = await ml.verify({ token: "not-a-real-token" })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.error.code).toBe("invalid-credentials")
  })
})
