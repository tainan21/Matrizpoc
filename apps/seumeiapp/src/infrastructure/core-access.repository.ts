import type { CorePrismaClient } from "@matriz/platform-db/core"
import type { CompanyRole } from "../domain/company"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"

export class CoreCompensationConflictError extends Error {
  constructor() {
    super("O tenant provisionado já possui atividade e não pode ser removido")
    this.name = "CoreCompensationConflictError"
  }
}

export function createCoreAccessRepository(
  db: CorePrismaClient,
): CompleteCoreAccessRepository {
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

    async listTenantMembers(tenantId) {
      const rows = await db.membership.findMany({
        where: { tenantId, appId: "seumei" },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          user: { select: { displayName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      })
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.user.displayName,
        email: row.user.email,
        role: row.role as CompanyRole,
        joinedAt: row.createdAt.toISOString(),
      }))
    },

    async listPendingInvitations(tenantId) {
      const rows = await db.membershipInvitation.findMany({
        where: { tenantId, appId: "seumei", status: "PENDING" },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      })
      return rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role as Exclude<CompanyRole, "OWNER">,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }))
    },

    async createInvitation(input) {
      const row = await db.$transaction((tx) =>
        tx.membershipInvitation.upsert({
          where: {
            tenantId_appId_email: {
              tenantId: input.tenantId,
              appId: "seumei",
              email: input.email,
            },
          },
          create: {
            tenantId: input.tenantId,
            appId: "seumei",
            email: input.email,
            role: input.role,
            tokenHash: input.tokenHash,
            status: "PENDING",
            invitedByUserId: input.invitedByUserId,
            expiresAt: input.expiresAt,
          },
          update: {
            role: input.role,
            tokenHash: input.tokenHash,
            status: "PENDING",
            invitedByUserId: input.invitedByUserId,
            expiresAt: input.expiresAt,
            acceptedByUserId: null,
            acceptedAt: null,
            revokedAt: null,
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        }),
      )
      return {
        id: row.id,
        email: row.email,
        role: row.role as Exclude<CompanyRole, "OWNER">,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }
    },

    async revokeInvitation(input) {
      const result = await db.$transaction((tx) =>
        tx.membershipInvitation.updateMany({
          where: {
            id: input.invitationId,
            tenantId: input.tenantId,
            appId: "seumei",
            status: "PENDING",
          },
          data: { status: "REVOKED", revokedAt: input.revokedAt },
        }),
      )
      return result.count === 1
    },

    async readInvitation(tokenHash) {
      const row = await db.membershipInvitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          tenantId: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          acceptedByUserId: true,
        },
      })
      return row
        ? {
            id: row.id,
            tenantId: row.tenantId,
            email: row.email,
            role: row.role as Exclude<CompanyRole, "OWNER">,
            status: row.status,
            expiresAt: row.expiresAt.toISOString(),
            acceptedByUserId: row.acceptedByUserId,
          }
        : null
    },

    async acceptInvitation(input) {
      return db.$transaction(async (tx) => {
        const invitation = await tx.membershipInvitation.findUnique({
          where: { tokenHash: input.tokenHash },
          select: {
            id: true,
            tenantId: true,
            appId: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            acceptedByUserId: true,
          },
        })
        if (!invitation || invitation.appId !== "seumei") {
          return { kind: "invalid" } as const
        }
        if (invitation.status === "ACCEPTED") {
          return invitation.acceptedByUserId === input.userId
            ? {
                kind: "accepted" as const,
                tenantId: invitation.tenantId,
                role: invitation.role as CompanyRole,
              }
            : { kind: "unusable" as const }
        }
        if (invitation.status !== "PENDING") {
          return { kind: "unusable" } as const
        }
        if (invitation.expiresAt.getTime() <= input.acceptedAt.getTime()) {
          return { kind: "expired" } as const
        }
        if (invitation.email !== input.email.trim().toLowerCase()) {
          return { kind: "email_mismatch" } as const
        }
        const registration = await tx.appRegistration.findUnique({
          where: {
            tenantId_appId: {
              tenantId: invitation.tenantId,
              appId: "seumei",
            },
          },
          select: { enabled: true },
        })
        if (!registration?.enabled) return { kind: "disabled" } as const

        const claimed = await tx.membershipInvitation.updateMany({
          where: { id: invitation.id, appId: "seumei", status: "PENDING" },
          data: {
            status: "ACCEPTED",
            acceptedByUserId: input.userId,
            acceptedAt: input.acceptedAt,
          },
        })
        if (claimed.count !== 1) return { kind: "conflict" } as const

        const membership = await tx.membership.upsert({
          where: {
            tenantId_userId_appId: {
              tenantId: invitation.tenantId,
              userId: input.userId,
              appId: "seumei",
            },
          },
          create: {
            tenantId: invitation.tenantId,
            userId: input.userId,
            appId: "seumei",
            role: invitation.role,
            invitedAt: input.acceptedAt,
          },
          update: { lastActiveAt: input.acceptedAt },
          select: { role: true },
        })
        return {
          kind: "accepted" as const,
          tenantId: invitation.tenantId,
          role: membership.role as CompanyRole,
        }
      })
    },

    async findTenantMember(input) {
      const row = await db.membership.findFirst({
        where: {
          id: input.membershipId,
          tenantId: input.tenantId,
          appId: "seumei",
        },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          user: { select: { displayName: true, email: true } },
        },
      })
      return row
        ? {
            id: row.id,
            userId: row.userId,
            name: row.user.displayName,
            email: row.user.email,
            role: row.role as CompanyRole,
            joinedAt: row.createdAt.toISOString(),
          }
        : null
    },

    async changeMembershipRole(input) {
      const result = await db.$transaction((tx) =>
        tx.membership.updateMany({
          where: {
            id: input.membershipId,
            tenantId: input.tenantId,
            appId: "seumei",
            role: input.expectedRole,
          },
          data: { role: input.role },
        }),
      )
      return result.count === 1
    },

    async removeMembership(input) {
      const result = await db.$transaction((tx) =>
        tx.membership.deleteMany({
          where: {
            id: input.membershipId,
            tenantId: input.tenantId,
            appId: "seumei",
            role: input.expectedRole,
          },
        }),
      )
      return result.count === 1
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
