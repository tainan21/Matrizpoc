import { describe, expect, it, vi } from "vitest"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import {
  acceptInvitationHandler,
  changeMembershipRoleHandler,
  createInvitationHandler,
  listMembersHandler,
  removeMembershipHandler,
  revokeInvitationHandler,
  type MembershipHttpServices,
} from "./membership-handlers"

const actor = { sessionUserId: "session_owner", name: "Ana", email: "ana@example.com" }
const company = { id: "company_a", tenantId: "tenant_a", name: "Oficina Aurora", slug: "oficina-aurora", createdByUserId: "user_owner", status: "ACTIVE" as const, operationType: "SERVICE" as const, city: "Recife", country: "BR" }

function services(overrides: Partial<MembershipHttpServices> = {}): MembershipHttpServices {
  const members = [
    { id: "owner", userId: "user_owner", name: "Ana", email: "ana@example.com", role: "OWNER" as const, joinedAt: "2026-08-20T10:00:00.000Z" },
    { id: "member", userId: "user_member", name: "Bia", email: "bia@example.com", role: "MEMBER" as const, joinedAt: "2026-08-20T11:00:00.000Z" },
  ]
  return {
    core: {
      resolveUser: vi.fn().mockResolvedValue({ id: "user_owner", name: "Ana", email: actor.email }),
      listSeumeiMemberships: vi.fn().mockResolvedValue([{ tenantId: "tenant_a", role: "OWNER" }]),
      listTenantMembers: vi.fn().mockResolvedValue(members),
      listPendingInvitations: vi.fn().mockResolvedValue([]),
      createInvitation: vi.fn().mockImplementation(async (input) => ({ id: "invite", email: input.email, role: input.role, expiresAt: input.expiresAt.toISOString(), createdAt: "2026-08-20T12:00:00.000Z" })),
      revokeInvitation: vi.fn().mockResolvedValue(true),
      readInvitation: vi.fn().mockResolvedValue({ id: "invite", tenantId: "tenant_a", email: "new@example.com", role: "VIEWER", status: "PENDING", expiresAt: "2026-08-27T12:00:00.000Z", acceptedByUserId: null }),
      acceptInvitation: vi.fn().mockResolvedValue({ kind: "accepted", tenantId: "tenant_a", role: "VIEWER" }),
      findTenantMember: vi.fn().mockImplementation(async ({ membershipId }) => members.find(({ id }) => id === membershipId) ?? null),
      changeMembershipRole: vi.fn().mockResolvedValue(true),
      removeMembership: vi.fn().mockResolvedValue(true),
    } as unknown as CompleteCoreAccessRepository,
    companies: {
      findByIdForTenantIds: vi.fn().mockResolvedValue(company),
      listVisibleByTenantIds: vi.fn().mockResolvedValue([company]),
    } as unknown as CompanyRepository,
    ...overrides,
  }
}

describe("membership HTTP boundaries", () => {
  it("lists presenter data without tenant or user identifiers", async () => {
    const result = await listMembersHandler(actor, "company_a", services())
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      directory: {
        companyName: "Oficina Aurora",
        members: [
          { id: "owner", roleLabel: "Proprietário" },
          { id: "member", roleLabel: "Membro" },
        ],
      },
    })
    expect(JSON.stringify(result.body)).not.toMatch(/tenant_a|user_owner/)
  })

  it("rejects tenant injection and an owner invitation before persistence", async () => {
    const svc = services()
    await expect(createInvitationHandler(actor, "company_a", { email: "new@example.com", role: "VIEWER", tenantId: "tenant_b" }, svc)).resolves.toEqual({ status: 400, body: { error: "invalid_request" } })
    await expect(createInvitationHandler(actor, "company_a", { email: "new@example.com", role: "OWNER" }, svc)).resolves.toEqual({ status: 400, body: { error: "invalid_request" } })
    expect(svc.core.createInvitation).not.toHaveBeenCalled()
  })

  it("returns a one-time relative share path without token hash", async () => {
    const result = await createInvitationHandler(actor, "company_a", { email: "new@example.com", role: "VIEWER" }, services(), { create: () => "plain-token" }, { now: () => new Date("2026-08-20T12:00:00.000Z") })
    expect(result).toMatchObject({ status: 201, body: { invitation: { email: "new@example.com" }, sharePath: "/invite/plain-token" } })
    expect(JSON.stringify(result.body)).not.toContain("tokenHash")
  })

  it("maps a foreign known invitation id to the same generic missing result", async () => {
    await expect(revokeInvitationHandler(actor, "company_a", "invite_tenant_b", services())).resolves.toEqual({ status: 404, body: { error: "membership_target_not_found" } })
  })

  it("changes and removes only allowed roles", async () => {
    await expect(changeMembershipRoleHandler(actor, "company_a", "member", { role: "VIEWER" }, services())).resolves.toMatchObject({ status: 200, body: { member: { id: "member", roleLabel: "Leitor" } } })
    await expect(removeMembershipHandler(actor, "company_a", "owner", services())).resolves.toEqual({ status: 409, body: { error: "owner_protected" } })
  })

  it("accepts from authenticated identity and returns cookie metadata outside the body", async () => {
    const result = await acceptInvitationHandler(actor, { token: "plain-token" }, services(), { now: () => new Date("2026-08-21T12:00:00.000Z") })
    expect(result).toMatchObject({
      status: 200,
      activeCompanyId: "company_a",
      body: { workspace: { companyName: "Oficina Aurora" } },
    })
    expect(JSON.stringify(result.body)).not.toMatch(/company_a|tenant_a/)
  })

  it("maps wrong-email acceptance to forbidden", async () => {
    const core = services().core
    vi.mocked(core.acceptInvitation).mockResolvedValue({ kind: "email_mismatch" })
    await expect(acceptInvitationHandler(actor, { token: "plain-token" }, services({ core }))).resolves.toEqual({ status: 403, body: { error: "capability_forbidden" } })
  })
})
