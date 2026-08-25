import { describe, expect, it } from "vitest"
import { asTenantId, asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../../companies/domain/company"
import {
  asMembershipId,
  type Membership,
} from "./membership"
import { createTenantContext } from "./tenant-context"

const tai = asUserId("user-demo-seumei")

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: asMembershipId("membership-tai-matriz"),
    userId: tai,
    companyId: asCompanyId(asTenantId("company-matriz")),
    role: "admin",
    status: "active",
    permissions: ["company.view", "apps.view"],
    ...overrides,
  }
}

describe("createTenantContext", () => {
  it("rejects a membership bound to another company", () => {
    expect(() =>
      createTenantContext({
        userId: tai,
        companyId: asCompanyId(asTenantId("company-galaxia")),
        membership: membership(),
      }),
    ).toThrow("membership-company-mismatch")
  })

  it("rejects an inactive membership", () => {
    expect(() =>
      createTenantContext({
        userId: tai,
        companyId: asCompanyId(asTenantId("company-matriz")),
        membership: membership({ status: "disabled" }),
      }),
    ).toThrow("membership-disabled")
  })

  it("creates an immutable context from a matching active membership", () => {
    const activeMembership = membership()
    const context = createTenantContext({
      userId: tai,
      companyId: activeMembership.companyId,
      membership: activeMembership,
    })

    expect(context).toEqual({
      userId: tai,
      companyId: activeMembership.companyId,
      membershipId: activeMembership.id,
      role: "admin",
      permissions: ["company.view", "apps.view"],
    })
    expect(Object.isFrozen(context)).toBe(true)
    expect(Object.isFrozen(context.permissions)).toBe(true)
  })
})
