import type { ContractPartyRole, ContractsPrismaClient, ContractStatus } from "@matriz/platform-db/contracts"

export type CreateContractInput = {
  tenantId: string; reference: string; title: string; originApp: string
  originEntityType: string; originEntityId: string; currency?: string
  totalValueCents?: number; templateId?: string | null; createdBy?: string | null
  effectiveFrom?: Date | null; effectiveTo?: Date | null
  parties: Array<{ role: ContractPartyRole; displayName: string; legalName?: string | null; document?: string | null; email?: string | null }>
  initialBodyMarkdown: string; initialVersionHash: string
}

export function makeContractRepo(db: ContractsPrismaClient) {
  return {
    listByTenant: (tenantId: string, status?: ContractStatus) => db.contract.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { parties: true, versions: true, events: true }, orderBy: { createdAt: "desc" },
    }),
    findById: (id: string, tenantId: string) => db.contract.findFirst({
      where: { id, tenantId }, include: { parties: true, versions: true, events: true, template: true },
    }),
    create: (input: CreateContractInput) => db.contract.create({
      data: {
        tenantId: input.tenantId, reference: input.reference, title: input.title,
        originApp: input.originApp, originEntityType: input.originEntityType, originEntityId: input.originEntityId,
        currency: input.currency ?? "BRL", totalValueCents: input.totalValueCents ?? 0,
        templateId: input.templateId ?? null, createdBy: input.createdBy ?? null,
        effectiveFrom: input.effectiveFrom ?? null, effectiveTo: input.effectiveTo ?? null,
        parties: { create: input.parties.map((party) => ({
          role: party.role, displayName: party.displayName,
          legalName: party.legalName ?? null, document: party.document ?? null, email: party.email ?? null,
        })) },
        versions: { create: { versionNo: 1, bodyMarkdown: input.initialBodyMarkdown, hash: input.initialVersionHash, createdBy: input.createdBy ?? null } },
        events: { create: { eventName: "contract.created", payload: { originApp: input.originApp, originEntityType: input.originEntityType, originEntityId: input.originEntityId } as never, actorId: input.createdBy ?? null } },
      },
      include: { parties: true, versions: true, events: true },
    }),
    updateStatus: (id: string, tenantId: string, status: ContractStatus) => db.contract.updateMany({ where: { id, tenantId }, data: { status } }),
  }
}

export type ContractRepo = ReturnType<typeof makeContractRepo>
