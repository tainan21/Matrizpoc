/**
 * Seumei DB Client — @matriz/platform-db/seumei
 *
 * Only the Seumei app should consume this entry point.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/seumei/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getSeumeiDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "SEUMEI_DATABASE_URL", globalKey: "__matrizSeumeiDb__" })
}

export type { PrismaClient as SeumeiPrismaClient } from "../../../../node_modules/.prisma/seumei/index.js"
export { EstablishmentType } from "../../../../node_modules/.prisma/seumei/index.js"
