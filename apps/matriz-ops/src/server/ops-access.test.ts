import { describe, expect, it } from "vitest"
import { resolveOpsAccess } from "./ops-access"

const oidc = {
  session: {
    identity: { user: { id: "user-1", name: "Operadora", email: "ops@example.test" } },
    issuedAt: "2026-08-30T00:00:00.000Z",
  },
  context: { userId: "user-1", appId: "matriz-ops" },
}
const operator = { role: "OWNER", active: true, revokedAt: null }

describe("Ops access", () => {
  it("keeps anonymous sessions distinct from denied operators", () => {
    expect(resolveOpsAccess(null, null)).toEqual({ state: "anonymous" })
    expect(resolveOpsAccess(oidc, null)).toEqual({ state: "denied", reason: "operator-required" })
  })

  it("rejects sessions issued for another app", () => {
    expect(resolveOpsAccess({ ...oidc, context: { ...oidc.context, appId: "spot" } }, operator))
      .toEqual({ state: "denied", reason: "app-binding" })
  })

  it("rejects inactive or revoked operators", () => {
    expect(resolveOpsAccess(oidc, { ...operator, active: false })).toEqual({ state: "denied", reason: "operator-required" })
    expect(resolveOpsAccess(oidc, { ...operator, revokedAt: new Date() })).toEqual({ state: "denied", reason: "operator-required" })
  })

  it("projects an active operator into the existing sensitive-action principal", () => {
    const access = resolveOpsAccess(oidc, operator)
    expect(access).toMatchObject({
      state: "authorized",
      principal: {
        session: {
          userId: "user-1",
          issuedAt: new Date("2026-08-30T00:00:00.000Z"),
          user: { email: "ops@example.test", displayName: "Operadora" },
        },
        operator,
      },
    })
  })
})
