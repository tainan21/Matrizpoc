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
import { getOrCreateSchemaClient } from "./client-runtime"

export function getCoreDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "CORE_DATABASE_URL", globalKey: "__matrizCoreDb__" })
}

export type { PrismaClient as CorePrismaClient } from "../../../../node_modules/.prisma/core/index.js"
export { AuthChallengeKind, AuthProvider } from "../../../../node_modules/.prisma/core/index.js"
