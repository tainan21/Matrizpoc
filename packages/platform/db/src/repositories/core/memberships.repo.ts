import type { CorePrismaClient } from "../../core"

type TenantRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

function normalized(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort()
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

/**
 * Transitional Core access adapter. Product repositories move app-local in
 * item 18; until then this adapter makes the authority split unambiguous:
 * memberships describe organization participation and appGrant is required
 * for every app permission.
 */
export function makeTenantAccessRepo(db: CorePrismaClient) {
  return {
    listForUser: (userId: string) =>
      db.tenantMembership.findMany({
        where: { userId, revokedAt: null },
        include: {
          tenant: true,
          appGrants: { where: { revokedAt: null }, orderBy: { appId: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      }),

    findActiveGrant: (userId: string, tenantId: string, appId: string) =>
      db.appGrant.findFirst({
        where: {
          tenantId,
          appId,
          revokedAt: null,
          membership: { userId, tenantId, revokedAt: null },
        },
        include: { membership: true },
      }),

    ensureMembership: (input: {
      tenantId: string
      userId: string
      tenantRoles?: readonly TenantRole[]
      invitedByUserId?: string
    }) =>
      db.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } },
        create: {
          tenantId: input.tenantId,
          userId: input.userId,
          tenantRoles: [...(input.tenantRoles ?? ["MEMBER"])],
          invitedAt: new Date(),
          invitedByUserId: input.invitedByUserId,
        },
        update: { lastActiveAt: new Date() },
      }),

    ensureGrant: (input: {
      membershipId: string
      appId: string
      appRoles?: readonly string[]
      capabilities?: readonly string[]
      actorUserId: string
      expectedTenantId?: string
      occurredAt?: Date
    }) => {
      const occurredAt = input.occurredAt ?? new Date()
      const appRoles = normalized(input.appRoles)
      const capabilities = normalized(input.capabilities)

      return db.$transaction(async (tx) => {
        const membership = await tx.tenantMembership.findUnique({
          where: { id: input.membershipId },
          select: { tenantId: true, revokedAt: true },
        })
        if (!membership || membership.revokedAt) {
          throw new Error("Active tenant membership not found")
        }
        if (input.expectedTenantId && input.expectedTenantId !== membership.tenantId) {
          throw new Error("Tenant membership mismatch")
        }

        const existing = await tx.appGrant.findUnique({
          where: {
            membershipId_appId: { membershipId: input.membershipId, appId: input.appId },
          },
        })
        const existingRoles = normalized(existing?.appRoles)
        const existingCapabilities = normalized(existing?.capabilities)
        if (
          existing &&
          !existing.revokedAt &&
          sameValues(existingRoles, appRoles) &&
          sameValues(existingCapabilities, capabilities)
        ) {
          return existing
        }

        const eventType = !existing
          ? "app_grant.granted"
          : existing.revokedAt
            ? "app_grant.regranted"
            : "app_grant.updated"
        const grant = existing
          ? await tx.appGrant.update({
              where: { id: existing.id },
              data: {
                tenantId: membership.tenantId,
                appRoles,
                capabilities,
                grantedAt: occurredAt,
                grantedByUserId: input.actorUserId,
                revokedAt: null,
                revokedByUserId: null,
                revocationReason: null,
              },
            })
          : await tx.appGrant.create({
              data: {
                tenantId: membership.tenantId,
                membershipId: input.membershipId,
                appId: input.appId,
                appRoles,
                capabilities,
                grantedAt: occurredAt,
                grantedByUserId: input.actorUserId,
              },
            })

        await tx.identityAuditEvent.create({
          data: {
            tenantId: membership.tenantId,
            actorUserId: input.actorUserId,
            eventType,
            subjectType: "AppGrant",
            subjectId: grant.id,
            metadata: { appId: input.appId, appRoles, capabilities },
            occurredAt,
          },
        })
        return grant
      })
    },

    revokeGrant: (input: {
      tenantId: string
      grantId: string
      actorUserId: string
      reason: string
      occurredAt?: Date
    }) => {
      const occurredAt = input.occurredAt ?? new Date()
      return db.$transaction(async (tx) => {
        const result = await tx.appGrant.updateMany({
          where: { id: input.grantId, tenantId: input.tenantId, revokedAt: null },
          data: {
            revokedAt: occurredAt,
            revokedByUserId: input.actorUserId,
            revocationReason: input.reason,
          },
        })
        if (result.count !== 1) throw new Error("Active app grant not found")
        await tx.identityAuditEvent.create({
          data: {
            tenantId: input.tenantId,
            actorUserId: input.actorUserId,
            eventType: "app_grant.revoked",
            subjectType: "AppGrant",
            subjectId: input.grantId,
            metadata: { reason: input.reason },
            occurredAt,
          },
        })
        return result
      })
    },
  }
}

export type TenantAccessRepo = ReturnType<typeof makeTenantAccessRepo>
