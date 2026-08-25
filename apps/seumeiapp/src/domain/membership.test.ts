import { describe, expect, it } from "vitest"
import {
  InvalidInvitationEmailError,
  can,
  canInviteRole,
  canManageRole,
  normalizeInvitationEmail,
  type MembershipCapability,
} from "./membership"
import type { CompanyRole } from "./company"

describe("Seumei membership capability policy", () => {
  it.each([
    ["OWNER", true], ["ADMIN", true], ["MEMBER", false], ["VIEWER", false],
  ] as const)("maps %s catalog management to %s", (role, allowed) => {
    expect(can(role, "catalog.manage")).toBe(allowed)
  })

  it.each<readonly [CompanyRole, MembershipCapability, boolean]>([
    ["OWNER", "workspace.read", true],
    ["OWNER", "members.invite.admin", true],
    ["ADMIN", "members.invite.admin", false],
    ["ADMIN", "members.invite.standard", true],
    ["MEMBER", "members.read", false],
    ["MEMBER", "workspace.read", true],
    ["VIEWER", "members.read", false],
    ["VIEWER", "workspace.read", true],
    ["OWNER", "recipes.manage", true],
    ["ADMIN", "stock.manage", true],
    ["MEMBER", "recipes.read", true],
    ["MEMBER", "stock.manage", false],
    ["VIEWER", "stock.read", true],
    ["OWNER", "orders.manage", true],
    ["MEMBER", "orders.manage", true],
    ["MEMBER", "customers.read", true],
    ["VIEWER", "orders.manage", false],
    ["OWNER", "finance.read", true],
    ["OWNER", "finance.manage", true],
    ["ADMIN", "finance.read", true],
    ["ADMIN", "finance.manage", true],
    ["MEMBER", "finance.read", false],
    ["MEMBER", "finance.manage", false],
    ["VIEWER", "finance.read", false],
    ["VIEWER", "finance.manage", false],
  ])("maps %s and %s to %s", (role, capability, allowed) => {
    expect(can(role, capability)).toBe(allowed)
  })

  it("never allows inviting or mutating an owner", () => {
    expect(canInviteRole("OWNER", "OWNER")).toBe(false)
    expect(canManageRole("OWNER", "OWNER")).toBe(false)
  })

  it("lets owners manage administrators and admins manage only standard roles", () => {
    expect(canInviteRole("OWNER", "ADMIN")).toBe(true)
    expect(canManageRole("OWNER", "ADMIN")).toBe(true)
    expect(canInviteRole("ADMIN", "ADMIN")).toBe(false)
    expect(canManageRole("ADMIN", "ADMIN")).toBe(false)
    expect(canInviteRole("ADMIN", "MEMBER")).toBe(true)
    expect(canManageRole("ADMIN", "VIEWER")).toBe(true)
  })

  it("normalizes a valid invitation email", () => {
    expect(normalizeInvitationEmail("  Colega@Example.COM ")).toBe(
      "colega@example.com",
    )
  })

  it.each(["", "sem-arroba", "a@", "@example.com", `${"a".repeat(250)}@x.com`])(
    "rejects invalid invitation email %j",
    (email) => {
      expect(() => normalizeInvitationEmail(email)).toThrow(
        InvalidInvitationEmailError,
      )
    },
  )
})
