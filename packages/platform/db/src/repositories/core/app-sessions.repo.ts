/**
 * AppSession Repository — persistent server-side sessions.
 *
 * A session belongs to one (user, tenant, app) and is identified by an opaque
 * cookie token. Only the SHA-256 hash is stored; the raw token lives only in
 * the client cookie.
 *
 * This is THE mechanism that makes auth real cross-app. When Seumei validates
 * a request, it looks up the session by tokenHash in the core schema via this
 * repo, no duplication.
 */
import { createHash } from "node:crypto"
import type { CorePrismaClient } from "../../core"

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}

export function makeAppSessionRepo(db: CorePrismaClient) {
  return {
    create: (input: {
      userId: string
      tenantId: string
      appId: string
      strategyId: string
      rawToken: string
      issuedAt: Date
      expiresAt: Date
      ipHash?: string | null
      userAgent?: string | null
    }) =>
      db.appSession.create({
        data: {
          userId: input.userId,
          tenantId: input.tenantId,
          appId: input.appId,
          strategyId: input.strategyId,
          tokenHash: hashToken(input.rawToken),
          issuedAt: input.issuedAt,
          expiresAt: input.expiresAt,
          ipHash: input.ipHash ?? null,
          userAgent: input.userAgent ?? null,
        },
      }),

    /**
     * Lookup by raw token. Returns null if not found, expired, or revoked.
     * Side-effect: updates lastSeenAt.
     */
    findActiveByToken: async (rawToken: string) => {
      const tokenHash = hashToken(rawToken)
      const session = await db.appSession.findUnique({
        where: { tokenHash },
        include: { user: true },
      })
      if (!session) return null
      if (session.revokedAt) return null
      if (session.expiresAt.getTime() <= Date.now()) return null

      // Lazy update of lastSeenAt (async, best-effort)
      void db.appSession
        .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
        .catch(() => {})

      return session
    },

    revoke: (id: string) =>
      db.appSession.update({ where: { id }, data: { revokedAt: new Date() } }),

    revokeByToken: async (rawToken: string) => {
      const tokenHash = hashToken(rawToken)
      return db.appSession
        .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
        .catch(() => null)
    },

    listByUser: (userId: string, opts: { includeRevoked?: boolean } = {}) =>
      db.appSession.findMany({
        where: {
          userId,
          ...(opts.includeRevoked ? {} : { revokedAt: null }),
        },
        orderBy: { lastSeenAt: "desc" },
      }),
  }
}

export type AppSessionRepo = ReturnType<typeof makeAppSessionRepo>
