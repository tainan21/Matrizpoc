/**
 * Contract Repository — minimal real persistence for the Contracts app.
 *
 * V1.3 scope: create a contract with parties and an initial version, append
 * an event, and list by tenant. Cross-app references (to Gig, Establishment)
 * MUST flow through ExternalLink rows in core — never via FK.
 */
import type {
  ContractPartyRole,
  ContractsPrismaClient,
  ContractStatus,
} from "../../contracts"

export type CreateContractInput = {
  tenantId: string
  reference: string
  title: string
  originApp: string // e.g., "seumei", "spot"
  originEntityType: string
  originEntityId: string
  currency?: string
  totalValueCents?: number
  templateId?: string | null
  createdBy?: string | null
  effectiveFrom?: Date | null
  effectiveTo?: Date | null
  parties: Array<{
    role: ContractPartyRole
    displayName: string
    legalName?: string | null
    document?: string | null
    email?: string | null
  }>
  initialBodyMarkdown: string
  initialVersionHash: string
}

export function makeContractRepo(db: ContractsPrismaClient) {
  return {
    listByTenant: (tenantId: string, status?: ContractStatus) =>
      db.contract.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        include: { parties: true, versions: true, events: true },
        orderBy: { createdAt: "desc" },
      }),

    findById: (id: string, tenantId: string) =>
      db.contract.findFirst({
        where: { id, tenantId },
        include: { parties: true, versions: true, events: true, template: true },
      }),

    create: (input: CreateContractInput) =>
      db.contract.create({
        data: {
          tenantId: input.tenantId,
          reference: input.reference,
          title: input.title,
          originApp: input.originApp,
          originEntityType: input.originEntityType,
          originEntityId: input.originEntityId,
          currency: input.currency ?? "BRL",
          totalValueCents: input.totalValueCents ?? 0,
          templateId: input.templateId ?? null,
          createdBy: input.createdBy ?? null,
          effectiveFrom: input.effectiveFrom ?? null,
          effectiveTo: input.effectiveTo ?? null,
          parties: {
            create: input.parties.map((p) => ({
              tenantId: input.tenantId,
              role: p.role,
              displayName: p.displayName,
              legalName: p.legalName ?? null,
              document: p.document ?? null,
              email: p.email ?? null,
            })),
          },
          versions: {
            create: {
              tenantId: input.tenantId,
              versionNo: 1,
              bodyMarkdown: input.initialBodyMarkdown,
              hash: input.initialVersionHash,
              createdBy: input.createdBy ?? null,
            },
          },
          events: {
            create: {
              tenantId: input.tenantId,
              eventName: "contract.created",
              payload: {
                originApp: input.originApp,
                originEntityType: input.originEntityType,
                originEntityId: input.originEntityId,
              } as never,
              actorId: input.createdBy ?? null,
            },
          },
        },
        include: { parties: true, versions: true, events: true },
      }),

    updateStatus: (id: string, tenantId: string, status: ContractStatus) =>
      db.contract.updateMany({
        where: { id, tenantId },
        data: { status },
      }),
  }
}

export type ContractRepo = ReturnType<typeof makeContractRepo>
