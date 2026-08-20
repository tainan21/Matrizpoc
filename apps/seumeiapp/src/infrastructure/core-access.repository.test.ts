import { describe, expect, it } from "vitest"
import type { CorePrismaClient } from "@matriz/platform-db/core"
import { createCoreAccessRepository } from "./core-access.repository"

function coreClient(options: {
  invitationStatus?: "PENDING" | "ACCEPTED" | "REVOKED"
  invitationEmail?: string
  invitationExpiresAt?: Date
  acceptedByUserId?: string | null
  appEnabled?: boolean
} = {}) {
  const calls: Array<{ method: string; args: unknown }> = []
  const invitationRecord = {
    id: "invitation_a",
    tenantId: "tenant_a",
    appId: "seumei",
    email: options.invitationEmail ?? "member@example.com",
    role: "MEMBER",
    status: options.invitationStatus ?? "PENDING",
    expiresAt:
      options.invitationExpiresAt ?? new Date("2026-08-27T12:00:00.000Z"),
    acceptedByUserId: options.acceptedByUserId ?? null,
  }
  const tx = {
    tenant: {
      upsert: async (args: unknown) => {
        calls.push({ method: "tenant.upsert", args })
        return { id: "tenant_a" }
      },
      delete: async (args: unknown) => {
        calls.push({ method: "tenant.delete", args })
        return { id: "tenant_a" }
      },
    },
    appRegistration: {
      upsert: async (args: unknown) => {
        calls.push({ method: "appRegistration.upsert", args })
        return { id: "registration_a" }
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "appRegistration.findUnique.tx", args })
        return { enabled: options.appEnabled ?? true }
      },
    },
    membership: {
      upsert: async (args: unknown) => {
        calls.push({ method: "membership.upsert", args })
        return { id: "membership_a", role: "MEMBER" }
      },
      count: async (args: unknown) => {
        calls.push({ method: "membership.count", args })
        return 1
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "membership.findUnique.tx", args })
        return { role: "OWNER" }
      },
      updateMany: async (args: unknown) => {
        calls.push({ method: "membership.updateMany.tx", args })
        return { count: 1 }
      },
      deleteMany: async (args: unknown) => {
        calls.push({ method: "membership.deleteMany.tx", args })
        return { count: 1 }
      },
    },
    membershipInvitation: {
      upsert: async (args: unknown) => {
        calls.push({ method: "membershipInvitation.upsert.tx", args })
        return {
          id: "invitation_a",
          email: "member@example.com",
          role: "MEMBER",
          expiresAt: new Date("2026-08-27T12:00:00.000Z"),
          createdAt: new Date("2026-08-20T12:00:00.000Z"),
        }
      },
      updateMany: async (args: unknown) => {
        calls.push({ method: "membershipInvitation.updateMany.tx", args })
        return { count: 1 }
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "membershipInvitation.findUnique.tx", args })
        return invitationRecord
      },
    },
  }
  const db = {
    user: {
      upsert: async (args: unknown) => {
        calls.push({ method: "user.upsert", args })
        return { id: "core_user_a", displayName: "Ana", email: "ana@example.com" }
      },
    },
    membership: {
      findMany: async (args: unknown) => {
        calls.push({ method: "membership.findMany", args })
        const where = (args as { where?: { tenantId?: string } }).where
        if (where?.tenantId) {
          return [{
            id: "membership_a",
            userId: "core_user_a",
            role: "OWNER",
            createdAt: new Date("2026-08-20T10:00:00.000Z"),
            user: { displayName: "Ana", email: "ana@example.com" },
          }]
        }
        return [{ tenantId: "tenant_a", role: "OWNER" }]
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "membership.findUnique", args })
        return { id: "membership_a" }
      },
      findFirst: async (args: unknown) => {
        calls.push({ method: "membership.findFirst", args })
        return {
          id: "membership_b",
          userId: "core_user_b",
          role: "MEMBER",
          createdAt: new Date("2026-08-20T11:00:00.000Z"),
          user: { displayName: "Bia", email: "bia@example.com" },
        }
      },
    },
    membershipInvitation: {
      findMany: async (args: unknown) => {
        calls.push({ method: "membershipInvitation.findMany", args })
        return [{
          id: "invitation_a",
          email: "member@example.com",
          role: "MEMBER",
          expiresAt: new Date("2026-08-27T12:00:00.000Z"),
          createdAt: new Date("2026-08-20T12:00:00.000Z"),
        }]
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "membershipInvitation.findUnique", args })
        return invitationRecord
      },
    },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
      calls.push({ method: "$transaction", args: null })
      return callback(tx)
    },
  }
  return { db: db as unknown as CorePrismaClient, calls, tx }
}

describe("createCoreAccessRepository", () => {
  it("resolves a persistent Core user by normalized email", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(
      repository.resolveUser({
        sessionUserId: "mock_user",
        name: "Ana",
        email: " ANA@Example.COM ",
      }),
    ).resolves.toEqual({ id: "core_user_a", name: "Ana", email: "ana@example.com" })
    expect(calls[0]).toMatchObject({
      method: "user.upsert",
      args: {
        where: { email: "ana@example.com" },
        create: { email: "ana@example.com", displayName: "Ana" },
      },
    })
  })

  it("lists only the user's Seumei memberships", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.listSeumeiMemberships("core_user_a")).resolves.toEqual([
      { tenantId: "tenant_a", role: "OWNER" },
    ])
    expect(calls.at(-1)).toEqual({
      method: "membership.findMany",
      args: {
        where: { userId: "core_user_a", appId: "seumei" },
        select: { tenantId: true, role: true },
        orderBy: { createdAt: "asc" },
      },
    })
  })

  it("provisions tenant, app registration and owner in one Core transaction", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await repository.provisionOwner({
      tenantId: "tenant_a",
      tenantName: "Empresa A",
      tenantSlug: "empresa-a",
      userId: "core_user_a",
    })

    expect(calls.map(({ method }) => method)).toEqual([
      "$transaction",
      "tenant.upsert",
      "appRegistration.upsert",
      "membership.upsert",
    ])
    expect(calls[3]).toMatchObject({
      args: {
        where: {
          tenantId_userId_appId: {
            tenantId: "tenant_a",
            userId: "core_user_a",
            appId: "seumei",
          },
        },
        create: { role: "OWNER" },
      },
    })
  })

  it("removes a just-provisioned tenant only after owner and membership-count checks", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await repository.removeProvisionedTenant({ tenantId: "tenant_a", userId: "core_user_a" })

    expect(calls.map(({ method }) => method)).toEqual([
      "$transaction",
      "membership.count",
      "membership.findUnique.tx",
      "tenant.delete",
    ])
  })

  it("lists members and pending invitations only inside one Seumei tenant", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.listTenantMembers("tenant_a")).resolves.toEqual([
      {
        id: "membership_a",
        userId: "core_user_a",
        name: "Ana",
        email: "ana@example.com",
        role: "OWNER",
        joinedAt: "2026-08-20T10:00:00.000Z",
      },
    ])
    await expect(repository.listPendingInvitations("tenant_a")).resolves.toEqual([
      {
        id: "invitation_a",
        email: "member@example.com",
        role: "MEMBER",
        expiresAt: "2026-08-27T12:00:00.000Z",
        createdAt: "2026-08-20T12:00:00.000Z",
      },
    ])

    expect(calls.at(-2)).toMatchObject({
      method: "membership.findMany",
      args: { where: { tenantId: "tenant_a", appId: "seumei" } },
    })
    expect(calls.at(-1)).toMatchObject({
      method: "membershipInvitation.findMany",
      args: {
        where: { tenantId: "tenant_a", appId: "seumei", status: "PENDING" },
      },
    })
  })

  it("creates or rotates a hashed invitation in a Core transaction", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.createInvitation({
      tenantId: "tenant_a",
      email: "member@example.com",
      role: "MEMBER",
      tokenHash: "sha256-token",
      invitedByUserId: "core_user_a",
      expiresAt: new Date("2026-08-27T12:00:00.000Z"),
    })).resolves.toMatchObject({ id: "invitation_a", role: "MEMBER" })

    expect(calls.at(-1)).toMatchObject({
      method: "membershipInvitation.upsert.tx",
      args: {
        where: {
          tenantId_appId_email: {
            tenantId: "tenant_a",
            appId: "seumei",
            email: "member@example.com",
          },
        },
        create: { tokenHash: "sha256-token", status: "PENDING" },
        update: {
          tokenHash: "sha256-token",
          status: "PENDING",
          acceptedByUserId: null,
          acceptedAt: null,
          revokedAt: null,
        },
      },
    })
  })

  it("revokes only a pending invitation inside the authorized tenant and app", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.revokeInvitation({
      tenantId: "tenant_a",
      invitationId: "invitation_a",
      revokedAt: new Date("2026-08-21T12:00:00.000Z"),
    })).resolves.toBe(true)

    expect(calls.at(-1)).toEqual({
      method: "membershipInvitation.updateMany.tx",
      args: {
        where: {
          id: "invitation_a",
          tenantId: "tenant_a",
          appId: "seumei",
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date("2026-08-21T12:00:00.000Z"),
        },
      },
    })
  })

  it("accepts a valid invitation and creates membership in one Core transaction", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.acceptInvitation({
      tokenHash: "sha256-token",
      userId: "core_user_b",
      email: "member@example.com",
      acceptedAt: new Date("2026-08-21T12:00:00.000Z"),
    })).resolves.toEqual({
      kind: "accepted",
      tenantId: "tenant_a",
      role: "MEMBER",
    })

    expect(calls.map(({ method }) => method).slice(-5)).toEqual([
      "$transaction",
      "membershipInvitation.findUnique.tx",
      "appRegistration.findUnique.tx",
      "membershipInvitation.updateMany.tx",
      "membership.upsert",
    ])
    expect(calls.at(-1)).toMatchObject({
      args: {
        where: {
          tenantId_userId_appId: {
            tenantId: "tenant_a",
            userId: "core_user_b",
            appId: "seumei",
          },
        },
        create: { role: "MEMBER", invitedAt: new Date("2026-08-21T12:00:00.000Z") },
      },
    })
  })

  it("reads invitation claims only by token hash without returning token material", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.readInvitation("sha256-token")).resolves.toEqual({
      id: "invitation_a",
      tenantId: "tenant_a",
      email: "member@example.com",
      role: "MEMBER",
      status: "PENDING",
      expiresAt: "2026-08-27T12:00:00.000Z",
      acceptedByUserId: null,
    })
    expect(calls.at(-1)).toMatchObject({
      method: "membershipInvitation.findUnique",
      args: { where: { tokenHash: "sha256-token" } },
    })
    expect(JSON.stringify(await repository.readInvitation("sha256-token"))).not.toContain("sha256-token")
  })

  it.each([
    [{ invitationEmail: "other@example.com" }, "email_mismatch"],
    [{ invitationExpiresAt: new Date("2026-08-20T12:00:00.000Z") }, "expired"],
    [{ invitationStatus: "REVOKED" as const }, "unusable"],
    [{ appEnabled: false }, "disabled"],
  ] as const)("denies an invitation without granting membership: %s", async (options, reason) => {
    const { db, calls } = coreClient(options)
    const repository = createCoreAccessRepository(db)

    await expect(repository.acceptInvitation({
      tokenHash: "sha256-token",
      userId: "core_user_b",
      email: "member@example.com",
      acceptedAt: new Date("2026-08-21T12:00:00.000Z"),
    })).resolves.toEqual({ kind: reason })
    expect(calls.some(({ method }) => method === "membership.upsert")).toBe(false)
  })

  it("treats acceptance replay by the same user as idempotent", async () => {
    const { db, calls } = coreClient({
      invitationStatus: "ACCEPTED",
      acceptedByUserId: "core_user_b",
    })
    const repository = createCoreAccessRepository(db)

    await expect(repository.acceptInvitation({
      tokenHash: "sha256-token",
      userId: "core_user_b",
      email: "member@example.com",
      acceptedAt: new Date("2026-08-21T12:00:00.000Z"),
    })).resolves.toEqual({
      kind: "accepted",
      tenantId: "tenant_a",
      role: "MEMBER",
    })
    expect(calls.some(({ method }) => method === "membership.upsert")).toBe(false)
  })

  it("reads and mutates a membership only with tenant, app and expected-role scope", async () => {
    const { db, calls } = coreClient()
    const repository = createCoreAccessRepository(db)

    await expect(repository.findTenantMember({
      tenantId: "tenant_a",
      membershipId: "membership_b",
    })).resolves.toMatchObject({ id: "membership_b", role: "MEMBER" })
    await expect(repository.changeMembershipRole({
      tenantId: "tenant_a",
      membershipId: "membership_b",
      expectedRole: "MEMBER",
      role: "VIEWER",
    })).resolves.toBe(true)
    await expect(repository.removeMembership({
      tenantId: "tenant_a",
      membershipId: "membership_b",
      expectedRole: "VIEWER",
    })).resolves.toBe(true)

    expect(calls.find(({ method }) => method === "membership.findFirst")).toMatchObject({
      args: { where: { id: "membership_b", tenantId: "tenant_a", appId: "seumei" } },
    })
    expect(calls.find(({ method }) => method === "membership.updateMany.tx")).toMatchObject({
      args: {
        where: {
          id: "membership_b",
          tenantId: "tenant_a",
          appId: "seumei",
          role: "MEMBER",
        },
        data: { role: "VIEWER" },
      },
    })
    expect(calls.find(({ method }) => method === "membership.deleteMany.tx")).toMatchObject({
      args: {
        where: {
          id: "membership_b",
          tenantId: "tenant_a",
          appId: "seumei",
          role: "VIEWER",
        },
      },
    })
  })
})
