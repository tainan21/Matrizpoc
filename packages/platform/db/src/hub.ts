/**
 * Hub DB Client — @matriz/platform-db/hub
 *
 * Wraps the Prisma client generated from `prisma/hub/schema.prisma`.
 * Only the Matriz Hub app should consume this entry point. L3 is enforced
 * by import boundaries: this is the only file that imports from `.prisma/hub`.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/hub/index.js"

type GlobalWithHub = typeof globalThis & {
  __matrizHubDb__?: PrismaClient
}

const globalForHub = globalThis as GlobalWithHub

export function getHubDb(): PrismaClient {
  if (!globalForHub.__matrizHubDb__) {
    globalForHub.__matrizHubDb__ = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.HUB_DATABASE_URL ??
            process.env.DATABASE_URL ??
            "postgresql://user:pass@localhost:5432/matriz?schema=hub",
        },
      },
      log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    })
  }
  return globalForHub.__matrizHubDb__
}

export type { PrismaClient as HubPrismaClient } from "../../../../node_modules/.prisma/hub/index.js"
export * from "../../../../node_modules/.prisma/hub/index.js"
