/** WillDash-owned, lazy and server-only Prisma client entrypoint. */
import { PrismaClient } from "../../../../node_modules/.prisma/willdash/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getWilldashDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "WILLDASH_DATABASE_URL", globalKey: "__matrizWilldashDb__" })
}

export type { PrismaClient as WilldashPrismaClient } from "../../../../node_modules/.prisma/willdash/index.js"
