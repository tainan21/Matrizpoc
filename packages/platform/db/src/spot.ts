/** Spot-owned, lazy and server-only Prisma client entrypoint. */
import { PrismaClient } from "../../../../node_modules/.prisma/spot/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getSpotDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "SPOT_DATABASE_URL", globalKey: "__matrizSpotDb__" })
}

export type { PrismaClient as SpotPrismaClient } from "../../../../node_modules/.prisma/spot/index.js"
