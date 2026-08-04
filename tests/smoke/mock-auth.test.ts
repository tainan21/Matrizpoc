import { describe, expect, it } from "vitest"
import {
  MOCK_GOOGLE_ACCOUNTS,
  createMockAuthState,
  type MockAuthClock,
} from "@matriz/platform-auth"

function fixedClock(): MockAuthClock {
  let now = new Date("2026-08-04T12:00:00.000Z")
  return {
    now: () => now,
    advance: (milliseconds) => { now = new Date(now.getTime() + milliseconds) },
  }
}

describe("mock auth domain", () => {
  it("creates the same tenant access for Google and direct email identities", () => {
    const auth = createMockAuthState({ clock: fixedClock() })
    const google = auth.signInWithGoogle(MOCK_GOOGLE_ACCOUNTS[0]!.id)
    const direct = auth.signInWithEmail("pessoa@matriz.com")

    expect(google.ok).toBe(true)
    expect(direct.ok).toBe(true)
    if (!google.ok || !direct.ok) return
    expect(google.value.identity.tenants).toEqual(direct.value.identity.tenants)
    expect(google.value.identity.tenants[0]!.enabledApps).toEqual([
      "matriz-hub", "spot", "seumei", "contracts", "willdash",
    ])
  })

  it("rejects unknown Google accounts and malformed direct emails", () => {
    const auth = createMockAuthState({ clock: fixedClock() })
    expect(auth.signInWithGoogle("missing").ok).toBe(false)
    expect(auth.signInWithEmail("not-an-email").ok).toBe(false)
  })

  it("verifies a six-digit OTP and rejects an incorrect code", () => {
    const auth = createMockAuthState({ clock: fixedClock() })
    const challenge = auth.startChallenge("otp", "otp@matriz.com")
    expect(challenge.ok).toBe(true)
    if (!challenge.ok) return

    expect(auth.verifyOtp(challenge.value.id, "000000").ok).toBe(false)
    expect(auth.verifyOtp(challenge.value.id, challenge.value.hint!).ok).toBe(true)
  })

  it("expires OTP challenges after ten minutes", () => {
    const clock = fixedClock()
    const auth = createMockAuthState({ clock })
    const challenge = auth.startChallenge("otp", "otp@matriz.com")
    if (!challenge.ok) throw new Error("challenge was not created")
    clock.advance(10 * 60 * 1000 + 1)
    expect(auth.verifyOtp(challenge.value.id, challenge.value.hint!).ok).toBe(false)
  })

  it("creates a one-use magic link token", () => {
    const auth = createMockAuthState({ clock: fixedClock() })
    const challenge = auth.startChallenge("magic-link", "magic@matriz.com")
    if (!challenge.ok) throw new Error("challenge was not created")
    const token = new URL(challenge.value.previewUrl!).searchParams.get("magic_token")!

    expect(auth.verifyMagicLink(token).ok).toBe(true)
    expect(auth.verifyMagicLink(token).ok).toBe(false)
  })

  it("records recent apps in most-recent-first order without duplicates", () => {
    const clock = fixedClock()
    const auth = createMockAuthState({ clock })
    auth.signInWithEmail("recent@matriz.com")
    auth.recordAppOpen("spot")
    clock.advance(1000)
    auth.recordAppOpen("contracts")
    clock.advance(1000)
    auth.recordAppOpen("spot")

    expect(auth.restoreSession()?.recentApps.map((item) => item.appId)).toEqual([
      "spot", "contracts",
    ])
    auth.signOut()
    expect(auth.restoreSession()).toBeNull()
  })
})
