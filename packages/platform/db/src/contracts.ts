/**
 * Contracts DB Client — @matriz/platform-db/contracts
 *
 * Only the Contracts app should consume this entry point.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/contracts/index.js"
import { getOrCreateSchemaClient } from "./client-runtime"

export function getContractsDb(): PrismaClient {
  return getOrCreateSchemaClient({ Client: PrismaClient, environmentName: "CONTRACTS_DATABASE_URL", globalKey: "__matrizContractsDb__" })
}

export type { PrismaClient as ContractsPrismaClient } from "../../../../node_modules/.prisma/contracts/index.js"
export { ContractPartyRole, ContractStatus } from "../../../../node_modules/.prisma/contracts/index.js"
