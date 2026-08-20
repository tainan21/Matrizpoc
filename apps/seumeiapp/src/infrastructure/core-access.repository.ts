import type { CorePrismaClient } from "@matriz/platform-db/core"
import type { CompanyRole } from "../domain/company"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"

export class CoreCompensationConflictError extends Error {
  constructor() {
    super("O tenant provisionado já possui atividade e não pode ser removido")
    this.name = "CoreCompensationConflictError"
  }
}

export function createCoreAccessRepository(
  db: CorePrismaClient,
): CoreAccessRepository {
  return {
    async resolveUser(actor) {
      const email = actor.email.trim().toLowerCase()
      const user = await db.user.upsert({
        where: { email },
        create: { email, displayName: actor.name.trim() || email.split("@")[0]! },
        update: actor.name.trim() ? { displayName: actor.name.trim() } : {},
      })
      return { id: user.id, name: user.displayName, email: user.email }
    },

    async listSeumeiMemberships(userId) {
      const rows = await db.membership.findMany({
        where: { userId, appId: "seumei" },
        select: { tenantId: true, role: true },
        orderBy: { createdAt: "asc" },
      })
      return rows.map(({ tenantId, role }) => ({
        tenantId,
        role: role as CompanyRole,
      }))
    },

    async hasSeumeiMembership(userId, tenantId) {
      const membership = await db.membership.findUnique({
        where: {
          tenantId_userId_appId: { tenantId, userId, appId: "seumei" },
        },
        select: { id: true },
      })
      return Boolean(membership)
    },

    async provisionOwner(input) {
      await db.$transaction(async (tx) => {
        await tx.tenant.upsert({
          where: { id: input.tenantId },
          create: {
            id: input.tenantId,
            name: input.tenantName,
            slug: input.tenantSlug,
          },
          update: { name: input.tenantName, slug: input.tenantSlug },
        })
        await tx.appRegistration.upsert({
          where: {
            tenantId_appId: { tenantId: input.tenantId, appId: "seumei" },
          },
          create: {
            tenantId: input.tenantId,
            appId: "seumei",
            manifestVersion: "0.1.0",
            contractVersion: "v1",
            enabled: true,
          },
          update: { enabled: true, disabledAt: null },
        })
        await tx.membership.upsert({
          where: {
            tenantId_userId_appId: {
              tenantId: input.tenantId,
              userId: input.userId,
              appId: "seumei",
            },
          },
          create: {
            tenantId: input.tenantId,
            userId: input.userId,
            appId: "seumei",
            role: "OWNER",
          },
          update: { role: "OWNER", lastActiveAt: new Date() },
        })
      })
    },

    async removeProvisionedTenant(input) {
      await db.$transaction(async (tx) => {
        const [membershipCount, owner] = await Promise.all([
          tx.membership.count({ where: { tenantId: input.tenantId } }),
          tx.membership.findUnique({
            where: {
              tenantId_userId_appId: {
                tenantId: input.tenantId,
                userId: input.userId,
                appId: "seumei",
              },
            },
            select: { role: true },
          }),
        ])
        if (membershipCount !== 1 || owner?.role !== "OWNER") {
          throw new CoreCompensationConflictError()
        }
        await tx.tenant.delete({ where: { id: input.tenantId } })
      })
    },
  }
}
