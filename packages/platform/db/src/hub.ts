/**
 * Hub DB Client — @matriz/platform-db/hub
 *
 * Wraps the Prisma client generated from `prisma/hub/schema.prisma`.
 * Only the Matriz Hub app should consume this entry point. L3 is enforced
 * by import boundaries: this is the only file that imports from `.prisma/hub`.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/hub/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getHubDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "HUB_DATABASE_URL", globalKey: "__matrizHubDb__" })
}

export type { PrismaClient as HubPrismaClient } from "../../../../node_modules/.prisma/hub/index.js"
