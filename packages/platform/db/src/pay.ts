import { PrismaClient } from "../../../../node_modules/.prisma/pay/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getPayDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "PAY_DATABASE_URL", globalKey: "__matrizPayDb__" })
}
export type { PrismaClient as PayPrismaClient } from "../../../../node_modules/.prisma/pay/index.js"
