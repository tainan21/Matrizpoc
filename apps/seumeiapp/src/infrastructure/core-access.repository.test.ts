import { describe, expect, it } from "vitest"
import type { CorePrismaClient } from "@matriz/platform-db/core"
import { createCoreAccessRepository } from "./core-access.repository"

function coreClient() {
  const calls: Array<{ method: string; args: unknown }> = []
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
    },
    membership: {
      upsert: async (args: unknown) => {
        calls.push({ method: "membership.upsert", args })
        return { id: "membership_a" }
      },
      count: async (args: unknown) => {
        calls.push({ method: "membership.count", args })
        return 1
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "membership.findUnique.tx", args })
        return { role: "OWNER" }
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
        return [{ tenantId: "tenant_a", role: "OWNER" }]
      },
      findUnique: async (args: unknown) => {
        calls.push({ method: "membership.findUnique", args })
        return { id: "membership_a" }
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
})
