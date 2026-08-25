import { createHash } from "node:crypto"
import type { CorePrismaClient } from "./persistence.js"

export interface RateLimitStore { consume(input: { key: string; limit: number; windowMs: number }): Promise<boolean> }

export function createCoreRateLimitStore(database: CorePrismaClient): RateLimitStore {
  return {
    async consume({ key, limit, windowMs }) {
      const keyHash = createHash("sha256").update(key).digest("hex")
      const rows = await database.$queryRawUnsafe<Array<{ count: number }>>(
        `INSERT INTO core.identity_rate_limits ("keyHash", "count", "expiresAt") VALUES ($1, 1, now() + ($2 * interval '1 millisecond'))
         ON CONFLICT ("keyHash") DO UPDATE SET "count" = CASE WHEN core.identity_rate_limits."expiresAt" <= now() THEN 1 ELSE core.identity_rate_limits."count" + 1 END,
           "expiresAt" = CASE WHEN core.identity_rate_limits."expiresAt" <= now() THEN now() + ($2 * interval '1 millisecond') ELSE core.identity_rate_limits."expiresAt" END
         RETURNING "count"`, keyHash, windowMs,
      )
      if (Math.random() < 0.01) await database.$executeRawUnsafe('DELETE FROM core.identity_rate_limits WHERE "expiresAt" < now()')
      return (rows[0]?.count ?? limit + 1) <= limit
    },
  }
}
