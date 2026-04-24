/**
 * Membership Repository — user ↔ tenant ↔ app bindings.
 *
 * This is the authoritative source for "is this user allowed on this app
 * within this tenant?". Seumei/Contracts/Hub should validate access through
 * this repo, never by inspecting cross-schema data.
 */
import type { CorePrismaClient } from "../../core"

export function makeMembershipRepo(db: CorePrismaClient) {
  return {
    listForUser: (userId: string) =>
      db.membership.findMany({
        where: { userId },
        include: { tenant: true },
        orderBy: { createdAt: "asc" },
      }),

    listForTenantApp: (tenantId: string, appId: string) =>
      db.membership.findMany({
        where: { tenantId, appId },
        include: { user: true },
      }),

    findOne: (userId: string, tenantId: string, appId: string) =>
      db.membership.findUnique({
        where: { tenantId_userId_appId: { tenantId, userId, appId } },
      }),

    /**
     * Ensure a membership exists. Used during first login to bootstrap the
     * relationship without duplicating rows.
     */
    ensure: async (input: {
      tenantId: string
      userId: string
      appId: string
      role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
    }) =>
      db.membership.upsert({
        where: {
          tenantId_userId_appId: {
            tenantId: input.tenantId,
            userId: input.userId,
            appId: input.appId,
          },
        },
        create: {
          tenantId: input.tenantId,
          userId: input.userId,
          appId: input.appId,
          role: input.role ?? "MEMBER",
        },
        update: {
          lastActiveAt: new Date(),
        },
      }),
  }
}

export type MembershipRepo = ReturnType<typeof makeMembershipRepo>
