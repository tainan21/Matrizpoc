import { describe, expect, it } from "vitest"
import type { Company } from "../domain/company"
import type {
  CoreMembershipRepository,
  InvitationAcceptanceResult,
} from "../domain/repositories/core-access-repository"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { AuthorizedCompanyContext } from "./company-onboarding"
import {
  InvitationConflictError,
  InvitationUnavailableError,
  MembershipCapabilityDeniedError,
  MembershipTargetNotFoundError,
  ProtectedOwnerError,
  acceptCompanyInvitation,
  changeCompanyMemberRole,
  inviteCompanyMember,
  readCompanyInvitation,
  readCompanyMembers,
  removeCompanyMember,
  revokeCompanyInvitation,
} from "./company-memberships"

const company: Company = {
  id: "company_a",
  tenantId: "tenant_a",
  name: "Oficina Aurora",
  slug: "oficina-aurora",
  createdByUserId: "user_owner",
  status: "ACTIVE",
  operationType: "SERVICE",
  city: "Recife",
  country: "BR",
}

function context(role: AuthorizedCompanyContext["role"]): AuthorizedCompanyContext {
  return { userId: "user_owner", role, company }
}

function coreRepository(overrides: Partial<CoreMembershipRepository> = {}) {
  const calls: Array<{ method: string; input: unknown }> = []
  const repository: CoreMembershipRepository = {
    async listTenantMembers(tenantId) {
      calls.push({ method: "listTenantMembers", input: tenantId })
      return [
        { id: "owner", userId: "user_owner", name: "Ana", email: "ana@example.com", role: "OWNER", joinedAt: "2026-08-20T10:00:00.000Z" },
        { id: "member", userId: "user_member", name: "Bia", email: "bia@example.com", role: "MEMBER", joinedAt: "2026-08-20T11:00:00.000Z" },
        { id: "admin", userId: "user_admin", name: "Caio", email: "caio@example.com", role: "ADMIN", joinedAt: "2026-08-20T12:00:00.000Z" },
      ]
    },
    async listPendingInvitations(tenantId) {
      calls.push({ method: "listPendingInvitations", input: tenantId })
      return [{ id: "invite_member", email: "dani@example.com", role: "MEMBER", expiresAt: "2026-08-27T12:00:00.000Z", createdAt: "2026-08-20T12:00:00.000Z" }]
    },
    async createInvitation(input) {
      calls.push({ method: "createInvitation", input })
      return { id: "invite_new", email: input.email, role: input.role, expiresAt: input.expiresAt.toISOString(), createdAt: "2026-08-20T12:00:00.000Z" }
    },
    async revokeInvitation(input) {
      calls.push({ method: "revokeInvitation", input })
      return true
    },
    async readInvitation(tokenHash) {
      calls.push({ method: "readInvitation", input: tokenHash })
      return { id: "invite_new", tenantId: "tenant_a", email: "new@example.com", role: "VIEWER", status: "PENDING", expiresAt: "2026-08-27T12:00:00.000Z", acceptedByUserId: null }
    },
    async acceptInvitation(input) {
      calls.push({ method: "acceptInvitation", input })
      return { kind: "accepted", tenantId: "tenant_a", role: "VIEWER" }
    },
    async findTenantMember(input) {
      calls.push({ method: "findTenantMember", input })
      const members = await repository.listTenantMembers(input.tenantId)
      return members.find(({ id }) => id === input.membershipId) ?? null
    },
    async changeMembershipRole(input) {
      calls.push({ method: "changeMembershipRole", input })
      return true
    },
    async removeMembership(input) {
      calls.push({ method: "removeMembership", input })
      return true
    },
    ...overrides,
  }
  return { repository, calls }
}

function companyRepository(): CompanyRepository {
  return {
    listVisibleByTenantIds: async (tenantIds) => tenantIds.includes("tenant_a") ? [company] : [],
    findByIdForTenantIds: async () => null,
    findByActorIdempotency: async () => null,
    createProvisioning: async () => company,
    markOnboarding: async () => company,
    markProvisioningFailed: async () => undefined,
    removeProvisioning: async () => undefined,
    readOnboarding: async () => null,
    saveOnboarding: async () => { throw new Error("unused") },
    completeOnboarding: async () => { throw new Error("unused") },
  }
}

describe("company membership application services", () => {
  it("denies the member directory before touching persistence", async () => {
    const { repository, calls } = coreRepository()
    await expect(readCompanyMembers(context("MEMBER"), repository, new Date("2026-08-21T12:00:00.000Z"))).rejects.toThrow(MembershipCapabilityDeniedError)
    expect(calls).toEqual([])
  })

  it("returns members and only non-expired pending invitations to an owner", async () => {
    const { repository } = coreRepository()
    await expect(readCompanyMembers(context("OWNER"), repository, new Date("2026-08-21T12:00:00.000Z"))).resolves.toMatchObject({
      members: [{ id: "owner" }, { id: "member" }, { id: "admin" }],
      invitations: [{ id: "invite_member" }],
    })
  })

  it("creates a seven-day hashed invitation and returns the plain token once", async () => {
    const { repository, calls } = coreRepository()
    await expect(inviteCompanyMember(
      context("OWNER"),
      { email: " NEW@Example.COM ", role: "VIEWER" },
      repository,
      { create: () => "plain-token" },
      { now: () => new Date("2026-08-20T12:00:00.000Z") },
    )).resolves.toMatchObject({ invitation: { email: "new@example.com", role: "VIEWER" }, sharePath: "/invite/plain-token" })

    expect(calls.find(({ method }) => method === "createInvitation")?.input).toMatchObject({
      tenantId: "tenant_a",
      email: "new@example.com",
      role: "VIEWER",
      tokenHash: "23fb79e20d37abf2418d78115eb0cc8c74b52f4ed8b91dda7fc03a1d41fc15e3",
      invitedByUserId: "user_owner",
      expiresAt: new Date("2026-08-27T12:00:00.000Z"),
    })
  })

  it("denies admin invitation by an admin and duplicate member email", async () => {
    const first = coreRepository()
    await expect(inviteCompanyMember(context("ADMIN"), { email: "new@example.com", role: "ADMIN" }, first.repository)).rejects.toThrow(MembershipCapabilityDeniedError)
    expect(first.calls).toEqual([])

    const second = coreRepository()
    await expect(inviteCompanyMember(context("OWNER"), { email: " BIA@example.com ", role: "MEMBER" }, second.repository)).rejects.toThrow(InvitationConflictError)
    expect(second.calls.some(({ method }) => method === "createInvitation")).toBe(false)
  })

  it("protects owners and administrators from unauthorized role changes", async () => {
    const ownerAttempt = coreRepository()
    await expect(changeCompanyMemberRole(context("OWNER"), { membershipId: "owner", role: "ADMIN" }, ownerAttempt.repository)).rejects.toThrow(ProtectedOwnerError)
    expect(ownerAttempt.calls.some(({ method }) => method === "changeMembershipRole")).toBe(false)

    const adminAttempt = coreRepository()
    await expect(changeCompanyMemberRole(context("ADMIN"), { membershipId: "admin", role: "MEMBER" }, adminAttempt.repository)).rejects.toThrow(MembershipCapabilityDeniedError)
    expect(adminAttempt.calls.some(({ method }) => method === "changeMembershipRole")).toBe(false)
  })

  it("changes and removes only a tenant-scoped standard membership", async () => {
    const changed = coreRepository()
    await expect(changeCompanyMemberRole(context("ADMIN"), { membershipId: "member", role: "VIEWER" }, changed.repository)).resolves.toMatchObject({ id: "member", role: "VIEWER" })
    expect(changed.calls.find(({ method }) => method === "changeMembershipRole")?.input).toEqual({ tenantId: "tenant_a", membershipId: "member", expectedRole: "MEMBER", role: "VIEWER" })

    const removed = coreRepository()
    await expect(removeCompanyMember(context("ADMIN"), "member", removed.repository)).resolves.toEqual({ membershipId: "member" })
    expect(removed.calls.find(({ method }) => method === "removeMembership")?.input).toEqual({ tenantId: "tenant_a", membershipId: "member", expectedRole: "MEMBER" })
  })

  it("revokes only an invitation visible in the authorized tenant", async () => {
    const { repository, calls } = coreRepository()
    await expect(revokeCompanyInvitation(context("ADMIN"), "invite_member", repository, { now: () => new Date("2026-08-21T12:00:00.000Z") })).resolves.toEqual({ invitationId: "invite_member" })
    expect(calls.find(({ method }) => method === "revokeInvitation")?.input).toEqual({ tenantId: "tenant_a", invitationId: "invite_member", revokedAt: new Date("2026-08-21T12:00:00.000Z") })

    await expect(revokeCompanyInvitation(context("OWNER"), "invite_tenant_b", repository)).rejects.toThrow(MembershipTargetNotFoundError)
  })

  it("previews and accepts a valid token without exposing tenant authority to the caller", async () => {
    const { repository, calls } = coreRepository()
    await expect(readCompanyInvitation("plain-token", repository, companyRepository(), { now: () => new Date("2026-08-21T12:00:00.000Z") })).resolves.toEqual({
      companyId: "company_a",
      companyName: "Oficina Aurora",
      invitedEmail: "new@example.com",
      role: "VIEWER",
      expiresAt: "2026-08-27T12:00:00.000Z",
    })
    await expect(acceptCompanyInvitation(
      { userId: "core_user_b", email: "new@example.com" },
      "plain-token",
      repository,
      companyRepository(),
      { now: () => new Date("2026-08-21T12:00:00.000Z") },
    )).resolves.toEqual({ company, role: "VIEWER" })
    expect(calls.find(({ method }) => method === "acceptInvitation")?.input).toMatchObject({
      tokenHash: "23fb79e20d37abf2418d78115eb0cc8c74b52f4ed8b91dda7fc03a1d41fc15e3",
      userId: "core_user_b",
      email: "new@example.com",
    })
  })

  it.each<readonly [InvitationAcceptanceResult, new () => Error]>([
    [{ kind: "expired" }, InvitationUnavailableError],
    [{ kind: "email_mismatch" }, MembershipCapabilityDeniedError],
    [{ kind: "conflict" }, InvitationConflictError],
  ])("maps rejected acceptance %s without returning a company", async (result, ErrorType) => {
    const { repository } = coreRepository({ acceptInvitation: async () => result })
    await expect(acceptCompanyInvitation(
      { userId: "core_user_b", email: "new@example.com" },
      "plain-token",
      repository,
      companyRepository(),
    )).rejects.toThrow(ErrorType)
  })
})
