/**
 * Seumei DB Client — @matriz/platform-db/seumei
 *
 * Only the Seumei app should consume this entry point.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/seumei/index.js"

type GlobalWithSeumei = typeof globalThis & {
  __matrizSeumeiDb__?: PrismaClient
}

const globalForSeumei = globalThis as GlobalWithSeumei

export function getSeumeiDb(): PrismaClient {
  if (!globalForSeumei.__matrizSeumeiDb__) {
    globalForSeumei.__matrizSeumeiDb__ = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.SEUMEI_DATABASE_URL ??
            process.env.DATABASE_URL ??
            "postgresql://user:pass@localhost:5432/matriz?schema=seumei",
        },
      },
      log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    })
  }
  return globalForSeumei.__matrizSeumeiDb__
}

export type { PrismaClient as SeumeiPrismaClient } from "../../../../node_modules/.prisma/seumei/index.js"
export * from "../../../../node_modules/.prisma/seumei/index.js"
