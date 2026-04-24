/**
 * Contracts DB Client — @matriz/platform-db/contracts
 *
 * Only the Contracts app should consume this entry point.
 */
import { PrismaClient } from "../../../../node_modules/.prisma/contracts/index.js"

type GlobalWithContracts = typeof globalThis & {
  __matrizContractsDb__?: PrismaClient
}

const globalForContracts = globalThis as GlobalWithContracts

export function getContractsDb(): PrismaClient {
  if (!globalForContracts.__matrizContractsDb__) {
    globalForContracts.__matrizContractsDb__ = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.CONTRACTS_DATABASE_URL ??
            process.env.DATABASE_URL ??
            "postgresql://user:pass@localhost:5432/matriz?schema=contracts",
        },
      },
      log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    })
  }
  return globalForContracts.__matrizContractsDb__
}

export type { PrismaClient as ContractsPrismaClient } from "../../../../node_modules/.prisma/contracts/index.js"
export * from "../../../../node_modules/.prisma/contracts/index.js"
