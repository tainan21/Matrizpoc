import { PrismaClient } from "../../../../node_modules/.prisma/ops/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getOpsDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "OPS_DATABASE_URL", globalKey: "__matrizOpsDb__" })
}
export type { PrismaClient as OpsPrismaClient } from "../../../../node_modules/.prisma/ops/index.js"
