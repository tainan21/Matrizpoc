import { describe, expect, it } from "vitest"

import { resolveAuthorizationContext } from "./authorization"

describe("server-side authorization context", () => {
  it("resolves only an active membership and app grant", async () => {
    const context = await resolveAuthorizationContext(
      {
        findAccess: async () => ({
          userId: "user-1",
          tenantId: "tenant-1",
          membershipId: "membership-1",
          tenantRoles: ["owner"],
          appId: "spot",
          appRoles: ["manager"],
          capabilities: ["spot.gig.read"],
        }),
      },
      { userId: "user-1", tenantId: "tenant-1", appId: "spot", sessionId: "session-1" },
      "trace-1",
    )

    expect(context).toEqual({
      userId: "user-1",
      tenantId: "tenant-1",
      membershipId: "membership-1",
      tenantRoles: ["owner"],
      appId: "spot",
      appRoles: ["manager"],
      capabilities: ["spot.gig.read"],
      sessionId: "session-1",
      traceId: "trace-1",
    })
    expect(Object.isFrozen(context)).toBe(true)
  })

  it("denies missing or revoked access without accepting roles from input", async () => {
    await expect(
      resolveAuthorizationContext(
        { findAccess: async () => null },
        { userId: "user-1", tenantId: "tenant-b", appId: "contracts", sessionId: "s" },
        "trace",
      ),
    ).rejects.toThrow(/denied/i)
  })
})
