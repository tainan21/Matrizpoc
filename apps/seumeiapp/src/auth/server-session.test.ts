import { describe, expect, it, vi } from "vitest"
import { resolveSeumeiSession } from "./server-session"

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

describe("resolveSeumeiSession", () => {
  it("returns only the authenticated actor and ignores tenant claims", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, {
      session: {
        identity: {
          user: { id: "session_a", name: "Ana", email: "ANA@example.com" },
          tenants: [{ tenantId: "untrusted", enabledApps: ["seumei"] }],
        },
        activeTenantId: "untrusted",
      },
    }))

    await expect(resolveSeumeiSession("sid=abc", fetcher)).resolves.toEqual({
      kind: "authenticated",
      actor: { sessionUserId: "session_a", name: "Ana", email: "ANA@example.com" },
    })
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/api/auth/mock/session"), {
      headers: { cookie: "sid=abc" },
      cache: "no-store",
    })
  })

  it("distinguishes signed out from an unavailable authority", async () => {
    await expect(resolveSeumeiSession("", vi.fn().mockResolvedValue(response(401, null)))).resolves.toEqual({ kind: "signed-out" })
    await expect(resolveSeumeiSession("", vi.fn().mockResolvedValue(response(503, null)))).resolves.toEqual({ kind: "unavailable" })
    await expect(resolveSeumeiSession("", vi.fn().mockRejectedValue(new Error("offline")))).resolves.toEqual({ kind: "unavailable" })
  })

  it("rejects malformed successful envelopes as unavailable", async () => {
    await expect(resolveSeumeiSession("", vi.fn().mockResolvedValue(response(200, { session: { identity: {} } })))).resolves.toEqual({ kind: "unavailable" })
  })
})
