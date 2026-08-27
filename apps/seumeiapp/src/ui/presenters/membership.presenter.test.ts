import { describe, expect, it } from "vitest"
import type { AuthorizedCompanyContext } from "../../application/company-onboarding"
import {
  toInvitationViewModel,
  toMemberDirectoryViewModel,
} from "./membership.presenter"

const context: AuthorizedCompanyContext = {
  userId: "user_owner",
  role: "OWNER",
  company: {
    id: "company_a",
    tenantId: "tenant_secret",
    name: "Oficina Aurora",
    slug: "oficina-aurora",
    createdByUserId: "user_owner",
    status: "ACTIVE",
    operationType: "SERVICE",
    city: "Recife",
    country: "BR",
  },
}

describe("membership presenters", () => {
  it("presents role-aware directory actions without tenant identifiers", () => {
    const viewModel = toMemberDirectoryViewModel(context, {
      members: [
        { id: "owner", userId: "user_owner", name: "Ana", email: "ana@example.com", role: "OWNER", joinedAt: "2026-08-20T10:00:00.000Z" },
        { id: "admin", userId: "user_admin", name: "Bia", email: "bia@example.com", role: "ADMIN", joinedAt: "2026-08-20T11:00:00.000Z" },
      ],
      invitations: [
        { id: "invite", email: "caio@example.com", role: "VIEWER", expiresAt: "2026-08-27T12:00:00.000Z", createdAt: "2026-08-20T12:00:00.000Z" },
      ],
    })

    expect(viewModel).toMatchObject({
      companyName: "Oficina Aurora",
      availableInvitationRoles: [
        { value: "ADMIN", label: "Administrador" },
        { value: "MEMBER", label: "Membro" },
        { value: "VIEWER", label: "Leitor" },
      ],
      members: [
        { id: "owner", roleLabel: "Proprietário", isCurrentUser: true, canChangeRole: false, canRemove: false },
        { id: "admin", roleLabel: "Administrador", isCurrentUser: false, canChangeRole: true, canRemove: true },
      ],
      invitations: [{ id: "invite", roleLabel: "Leitor", canRevoke: true }],
    })
    expect(JSON.stringify(viewModel)).not.toContain("tenant_secret")
  })

  it("limits administrator controls to member and viewer roles", () => {
    const viewModel = toMemberDirectoryViewModel(
      { ...context, role: "ADMIN" },
      {
        members: [
          { id: "admin", userId: "user_admin", name: "Admin", email: "admin@example.com", role: "ADMIN", joinedAt: "2026-08-20T10:00:00.000Z" },
          { id: "member", userId: "user_member", name: "Member", email: "member@example.com", role: "MEMBER", joinedAt: "2026-08-20T11:00:00.000Z" },
        ],
        invitations: [],
      },
    )
    expect(viewModel.availableInvitationRoles.map(({ value }) => value)).toEqual(["MEMBER", "VIEWER"])
    expect(viewModel.members).toMatchObject([
      { id: "admin", canChangeRole: false, canRemove: false },
      { id: "member", canChangeRole: true, canRemove: true },
    ])
  })

  it("presents invitation acceptance without internal authority fields", () => {
    const viewModel = toInvitationViewModel({
      companyId: "company_a",
      companyName: "Oficina Aurora",
      invitedEmail: "new@example.com",
      role: "VIEWER",
      expiresAt: "2026-08-27T12:00:00.000Z",
    }, "new@example.com")
    expect(viewModel).toEqual({
      companyName: "Oficina Aurora",
      invitedEmail: "new@example.com",
      roleLabel: "Leitor",
      expiresAtLabel: "27/08/2026",
      canAccept: true,
    })
    expect(JSON.stringify(viewModel)).not.toContain("company_a")
  })
})
