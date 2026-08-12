/**
 * Core DB Client — @matriz/platform-db/core
 *
 * Wraps the Prisma client generated from `prisma/core/schema.prisma`.
 * Exposes the client as a process-wide singleton to avoid connection storms
 * during Next.js hot reload.
 *
 * Consumers (Hub, Seumei, Contracts, ...) MUST read/write to the core schema
 * ONLY through this module. No other schema client may reach into the core
 * tables directly — L3 (cross-schema isolation) is enforced by import
 * boundaries: this is the only file that imports from `.prisma/core`.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/core/index.js"

type GlobalWithCore = typeof globalThis & {
  __matrizCoreDb__?: PrismaClient
}

const globalForCore = globalThis as GlobalWithCore

export function getCoreDb(): PrismaClient {
  if (!globalForCore.__matrizCoreDb__) {
    globalForCore.__matrizCoreDb__ = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.CORE_DATABASE_URL ??
            process.env.DATABASE_URL ??
            "postgresql://user:pass@localhost:5432/matriz?schema=core",
        },
      },
      log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    })
  }
  return globalForCore.__matrizCoreDb__
}

export type { PrismaClient as CorePrismaClient } from "../../../../node_modules/.prisma/core/index.js"
export * from "../../../../node_modules/.prisma/core/index.js"
