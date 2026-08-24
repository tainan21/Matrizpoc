import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { asTenantId, asUserId } from "@matriz/foundation-types"
import type { AuthSession } from "@matriz/platform-auth"
import {
  AuthContext,
  type AuthContextValue,
} from "@matriz/platform-auth/client"
import { SeumeiDemoAccess } from "./SeumeiDemoAccess"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

describe("SeumeiDemoAccess", () => {
  it("authenticates the canonical demo account through the broker", async () => {
    const demoSession: AuthSession = {
      identity: {
        user: {
          id: asUserId("user-demo-seumei"),
          name: "Tai Demo",
          email: "demo@seumei.local",
        },
        tenants: [],
      },
      activeTenantId: asTenantId("tenant_demo"),
      issuedAt: "2026-08-24T12:00:00.000Z",
      expiresAt: "2027-08-24T12:00:00.000Z",
      strategyId: "email",
    }
    const signInWithEmail = vi.fn(async () => demoSession)
    const recordAppOpen = vi.fn(async () => undefined)
    const acceptSession = vi.fn()
    const auth: AuthContextValue = {
      status: "signed-out",
      session: null,
      error: null,
      strategies: [],
      defaultStrategyId: "email",
      broker: {
        startChallenge: vi.fn(),
        verifyOtp: vi.fn(),
        verifyMagicLink: vi.fn(),
        signInWithGoogle: vi.fn(),
        signInWithEmail,
        restoreSession: vi.fn(),
        recordAppOpen,
        signOut: vi.fn(),
      },
      start: vi.fn(),
      verify: vi.fn(),
      acceptSession,
      signOut: vi.fn(),
      refresh: vi.fn(),
      setActiveTenant: vi.fn(),
    }

    render(
      <AuthContext.Provider value={auth}>
        <SeumeiDemoAccess />
      </AuthContext.Provider>,
    )
    fireEvent.click(screen.getByRole("button", { name: /entrar no modo demo/i }))

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith("demo@seumei.local")
      expect(acceptSession).toHaveBeenCalledWith(demoSession)
      expect(recordAppOpen).toHaveBeenCalledWith("seumei")
      expect(push).toHaveBeenCalledWith("/hub")
    })
  })
})
