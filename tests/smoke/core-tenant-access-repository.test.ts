import { describe, expect, it, vi } from "vitest"
import { makeTenantAccessRepo } from "../../packages/platform/db/src/repositories/core/memberships.repo"

describe("tenant access repository", () => {
  it("requires both an active membership and active app grant", async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const repo = makeTenantAccessRepo({ appGrant: { findFirst } } as never)

    await repo.findActiveGrant("user-a", "tenant-a", "spot")

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-a",
        appId: "spot",
        revokedAt: null,
        membership: { userId: "user-a", tenantId: "tenant-a", revokedAt: null },
      },
      include: { membership: true },
    })
  })

  it("creates organizational membership without implicit app authority", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "membership-a" })
    const repo = makeTenantAccessRepo({ tenantMembership: { upsert } } as never)

    await repo.ensureMembership({ tenantId: "tenant-a", userId: "user-a" })

    const call = upsert.mock.calls[0]?.[0]
    expect(call.create.tenantRoles).toEqual(["MEMBER"])
    expect(call.create).not.toHaveProperty("appId")
  })

  it("derives tenant from membership and audits a new grant atomically", async () => {
    const findMembership = vi.fn().mockResolvedValue({ tenantId: "tenant-a", revokedAt: null })
    const findGrant = vi.fn().mockResolvedValue(null)
    const createGrant = vi.fn().mockResolvedValue({ id: "grant-a" })
    const createAudit = vi.fn().mockResolvedValue({ id: "audit-a" })
    const transaction = vi.fn(async (work: (tx: any) => unknown) =>
      work({
        tenantMembership: { findUnique: findMembership },
        appGrant: { findUnique: findGrant, create: createGrant },
        identityAuditEvent: { create: createAudit },
      }),
    )
    const repo = makeTenantAccessRepo({ $transaction: transaction } as never)

    await repo.ensureGrant({
      membershipId: "membership-a",
      appId: "spot",
      appRoles: ["EDITOR"],
      capabilities: ["gigs:write"],
      actorUserId: "admin-a",
      expectedTenantId: "tenant-a",
    })

    expect(createGrant).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tenant-a", membershipId: "membership-a" }),
    })
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tenant-a", eventType: "app_grant.granted" }),
    })
  })

  it("rejects a tenant A/B mismatch before any grant or audit write", async () => {
    const createGrant = vi.fn()
    const createAudit = vi.fn()
    const transaction = vi.fn(async (work: (tx: any) => unknown) =>
      work({
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ tenantId: "tenant-a", revokedAt: null }),
        },
        appGrant: { findUnique: vi.fn(), create: createGrant, update: vi.fn() },
        identityAuditEvent: { create: createAudit },
      }),
    )
    const repo = makeTenantAccessRepo({ $transaction: transaction } as never)

    await expect(
      repo.ensureGrant({
        membershipId: "membership-a",
        appId: "spot",
        actorUserId: "admin-b",
        expectedTenantId: "tenant-b",
      }),
    ).rejects.toThrow("Tenant membership mismatch")
    expect(createGrant).not.toHaveBeenCalled()
    expect(createAudit).not.toHaveBeenCalled()
  })

  it("treats an identical active grant as an unaudited idempotent no-op", async () => {
    const existing = {
      id: "grant-a",
      appRoles: ["EDITOR"],
      capabilities: ["gigs:read"],
      revokedAt: null,
    }
    const update = vi.fn()
    const createAudit = vi.fn()
    const transaction = vi.fn(async (work: (tx: any) => unknown) =>
      work({
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ tenantId: "tenant-a", revokedAt: null }),
        },
        appGrant: { findUnique: vi.fn().mockResolvedValue(existing), update },
        identityAuditEvent: { create: createAudit },
      }),
    )
    const repo = makeTenantAccessRepo({ $transaction: transaction } as never)

    await expect(
      repo.ensureGrant({
        membershipId: "membership-a",
        appId: "spot",
        appRoles: ["EDITOR", "EDITOR"],
        capabilities: ["gigs:read"],
        actorUserId: "admin-a",
      }),
    ).resolves.toBe(existing)
    expect(update).not.toHaveBeenCalled()
    expect(createAudit).not.toHaveBeenCalled()
  })

  it("reactivates a grant, resets revocation state and audits regrant", async () => {
    const occurredAt = new Date("2026-08-12T13:00:00.000Z")
    const update = vi.fn().mockResolvedValue({ id: "grant-a" })
    const createAudit = vi.fn()
    const transaction = vi.fn(async (work: (tx: any) => unknown) =>
      work({
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ tenantId: "tenant-a", revokedAt: null }),
        },
        appGrant: {
          findUnique: vi.fn().mockResolvedValue({
            id: "grant-a",
            appRoles: ["VIEWER"],
            capabilities: [],
            revokedAt: new Date("2026-08-11T00:00:00.000Z"),
          }),
          update,
        },
        identityAuditEvent: { create: createAudit },
      }),
    )
    const repo = makeTenantAccessRepo({ $transaction: transaction } as never)

    await repo.ensureGrant({
      membershipId: "membership-a",
      appId: "spot",
      appRoles: ["EDITOR"],
      actorUserId: "admin-a",
      occurredAt,
    })

    expect(update).toHaveBeenCalledWith({
      where: { id: "grant-a" },
      data: expect.objectContaining({
        grantedAt: occurredAt,
        grantedByUserId: "admin-a",
        revokedAt: null,
        revokedByUserId: null,
        revocationReason: null,
      }),
    })
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: "app_grant.regranted" }),
    })
  })

  it("audits active role/capability changes and refreshes grant provenance", async () => {
    const occurredAt = new Date("2026-08-12T14:00:00.000Z")
    const update = vi.fn().mockResolvedValue({ id: "grant-a" })
    const createAudit = vi.fn()
    const transaction = vi.fn(async (work: (tx: any) => unknown) =>
      work({
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ tenantId: "tenant-a", revokedAt: null }),
        },
        appGrant: {
          findUnique: vi.fn().mockResolvedValue({
            id: "grant-a",
            appRoles: ["VIEWER"],
            capabilities: ["gigs:read"],
            revokedAt: null,
          }),
          update,
        },
        identityAuditEvent: { create: createAudit },
      }),
    )
    const repo = makeTenantAccessRepo({ $transaction: transaction } as never)

    await repo.ensureGrant({
      membershipId: "membership-a",
      appId: "spot",
      appRoles: ["EDITOR"],
      capabilities: ["gigs:read", "gigs:write"],
      actorUserId: "admin-a",
      occurredAt,
    })

    expect(update).toHaveBeenCalledWith({
      where: { id: "grant-a" },
      data: expect.objectContaining({ grantedAt: occurredAt, grantedByUserId: "admin-a" }),
    })
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: "app_grant.updated" }),
    })
  })

  it("revokes a tenant-scoped grant and writes its audit event atomically", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const create = vi.fn().mockResolvedValue({ id: "audit-a" })
    const transaction = vi.fn(async (work: (tx: any) => unknown) =>
      work({ appGrant: { updateMany }, identityAuditEvent: { create } }),
    )
    const repo = makeTenantAccessRepo({ $transaction: transaction } as never)
    const occurredAt = new Date("2026-08-12T12:00:00.000Z")

    await repo.revokeGrant({
      tenantId: "tenant-a",
      grantId: "grant-a",
      actorUserId: "admin-a",
      reason: "access removed",
      occurredAt,
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "grant-a", tenantId: "tenant-a", revokedAt: null },
      data: {
        revokedAt: occurredAt,
        revokedByUserId: "admin-a",
        revocationReason: "access removed",
      },
    })
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-a",
        eventType: "app_grant.revoked",
        subjectId: "grant-a",
      }),
    })
  })
})
