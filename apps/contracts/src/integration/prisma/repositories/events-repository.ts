import type { ContractsPrismaClient } from "@matriz/platform-db/contracts"

export function makeContractEventRepo(db: ContractsPrismaClient) {
  return {
    append: (input: { tenantId: string; contractId: string; eventName: string; payload?: Record<string, unknown> | null; actorId?: string | null; occurredAt?: Date }) =>
      db.contractEvent.create({ data: {
        tenantId: input.tenantId, contractId: input.contractId, eventName: input.eventName,
        payload: (input.payload ?? null) as never, actorId: input.actorId ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      } }),
    listByContract: (contractId: string, tenantId: string, limit = 100) => db.contractEvent.findMany({
      where: { contractId, tenantId }, orderBy: { occurredAt: "desc" }, take: limit,
    }),
  }
}

export type ContractEventRepo = ReturnType<typeof makeContractEventRepo>
