/**
 * Smoke test end-to-end cross-app (L6 + L8 + L11).
 *
 * Simula o fluxo real:
 *   Spot (Gig)  --adapter-->  CreateContractFromGigInput (DTO v1)
 *                              |
 *                              v
 *   EventBus.emit("contract.created")  (L7)
 *                              +
 *   ExternalLinkStore.create(...)       (L5)
 *                              |
 *                              v
 *   Contracts.createFromGig(dto)  --adapter reverso-->  Contract local
 *                              |
 *                              v
 *   toSummaryDTO(c)  --valida schema ContractSummaryDTO v1
 *
 * Repete para Seumei.
 * Willdash: prova agregacao read-only via bus.history().
 */
import { describe, it, expect, beforeEach } from "vitest"
import { asTenantId, asAppId } from "@matriz/foundation-types"
import {
  createContractFromGigInputSchema,
  createContractFromEstablishmentInputSchema,
  contractSummarySchema,
  type CreateContractFromGigInput,
  type CreateContractFromEstablishmentInput,
} from "@matriz/integration-api-contracts"
import {
  createEventBus,
  type EventBus,
} from "@matriz/integration-events"
import {
  createExternalLinkStore,
  type ExternalLinkStore,
} from "@matriz/integration-external-links"
import {
  createInMemoryContractRepository,
  createInMemoryContractTemplateRepository,
  createInMemoryCounterpartyRepository,
} from "../../apps/contracts/src/mock/repositories"
import { createContractsUseCases, type ContractsUseCases } from "../../apps/contracts/src/application/use-cases"

const TENANT = asTenantId("tenant-acme")
const SPOT = asAppId("spot")
const SEUMEI = asAppId("seumei")
const CONTRACTS = asAppId("contracts")

interface TestRig {
  bus: EventBus
  links: ExternalLinkStore
  contracts: ContractsUseCases
}

function buildRig(): TestRig {
  return {
    bus: createEventBus(),
    links: createExternalLinkStore(),
    contracts: createContractsUseCases({
      contracts: createInMemoryContractRepository([]),
      templates: createInMemoryContractTemplateRepository(),
      counterparties: createInMemoryCounterpartyRepository([]),
    }),
  }
}

describe("cross-app application flow (L6 / L8 / L11)", () => {
  let rig: TestRig

  beforeEach(() => {
    rig = buildRig()
  })

  it("spot gig -> DTO -> event + external link -> contract local -> summary DTO", async () => {
    const dto: CreateContractFromGigInput = {
      tenantId: TENANT,
      gig: {
        id: "gig-001",
        tenantId: TENANT,
        title: "Show na Matriz",
        venueName: "Matriz Bar",
        startsAt: "2026-02-10T21:00:00.000Z",
        endsAt: "2026-02-11T00:00:00.000Z",
        bandName: "The Nodes",
        feeAmount: 3200,
        currency: "BRL",
      },
      counterpartyName: "Matriz Bar",
      counterpartyRole: "Venue",
    }
    // Valida o DTO v1 (smoke de contrato)
    expect(createContractFromGigInputSchema.parse(dto)).toBeTruthy()

    // Emissao que o gateway do Spot faria
    const envelope = rig.bus.emit("contract.created", {
      sourceApp: SPOT,
      tenantId: TENANT,
      payload: {
        contractId: "pending",
        tenantId: TENANT,
        originApp: SPOT,
        title: dto.gig.title,
      },
    })
    expect(envelope.version).toBe("v1")

    rig.links.create({
      tenantId: TENANT,
      localApp: "contracts",
      localEntityType: "contract",
      localEntityId: "pending",
      externalApp: "spot",
      externalEntityType: "gig",
      externalEntityId: dto.gig.id,
      relationType: "contract.source",
      snapshot: { title: dto.gig.title },
    })

    // Contracts consome o DTO e materializa entidade local (adapter reverso L6)
    const created = await rig.contracts.createFromGig(dto)
    expect(created.originApp).toBe("spot")
    expect(created.externalReference).toBe("gig-001")
    expect(created.amount).toBe(3200)

    // Summary DTO fecha o loop (Contract local -> DTO v1)
    const summary = rig.contracts.toSummaryDTO(created)
    expect(contractSummarySchema.parse(summary)).toBeTruthy()
    expect(summary.originApp).toBe("spot")
    expect(summary.parties.length).toBeGreaterThanOrEqual(2)

    // ExternalLinks refletem o vinculo entre apps
    const links = rig.links.findLinksFor({ tenantId: TENANT, app: "contracts" })
    expect(links).toHaveLength(1)
    expect(links[0]?.externalApp).toBe("spot")

    // EventBus viu o evento
    const hist = rig.bus.history()
    expect(hist).toHaveLength(1)
    expect(hist[0]?.name).toBe("contract.created")
  })

  it("seumei establishment -> DTO -> event -> contract local -> summary DTO", async () => {
    const dto: CreateContractFromEstablishmentInput = {
      tenantId: TENANT,
      establishment: {
        id: "est-001",
        tenantId: TENANT,
        name: "Bar do Will",
        type: "bar",
        address: "Rua das Flores, 100",
        ownerName: "Will Silva",
        serviceRadiusKm: 5,
      },
      counterpartyName: "Bar do Will",
      counterpartyRole: "Client",
      serviceDescription: "Mesa de som + tecnico de eventos",
    }
    expect(createContractFromEstablishmentInputSchema.parse(dto)).toBeTruthy()

    rig.bus.emit("seumei.establishment.selected", {
      sourceApp: SEUMEI,
      tenantId: TENANT,
      payload: {
        establishmentId: dto.establishment.id,
        tenantId: TENANT,
        name: dto.establishment.name,
      },
    })

    const created = await rig.contracts.createFromEstablishment(dto)
    expect(created.originApp).toBe("seumei")
    expect(created.externalReference).toBe("est-001")
    expect(created.notes).toContain("Mesa de som")

    const summary = rig.contracts.toSummaryDTO(created)
    expect(contractSummarySchema.parse(summary).originApp).toBe("seumei")
  })

  it("willdash agrega eventos de todos os apps via bus.history() (read-only)", () => {
    rig.bus.emit("spot.gig.created", {
      sourceApp: SPOT,
      tenantId: TENANT,
      payload: {
        gigId: "gig-001",
        tenantId: TENANT,
        title: "Show na Matriz",
        bandName: "The Nodes",
        venueName: "Matriz Bar",
      },
    })
    rig.bus.emit("contract.created", {
      sourceApp: SPOT,
      tenantId: TENANT,
      payload: {
        contractId: "c-1",
        tenantId: TENANT,
        originApp: SPOT,
        title: "Contrato Spot",
      },
    })
    rig.bus.emit("contract.created", {
      sourceApp: CONTRACTS,
      tenantId: TENANT,
      payload: {
        contractId: "c-2",
        tenantId: TENANT,
        originApp: CONTRACTS,
        title: "Contrato manual",
      },
    })

    const hist = rig.bus.history()
    expect(hist).toHaveLength(3)

    // Agregacao equivalente ao que aggregateByApp() faria
    const bySource = hist.reduce<Record<string, number>>((acc, e) => {
      acc[e.sourceApp] = (acc[e.sourceApp] ?? 0) + 1
      return acc
    }, {})
    expect(bySource.spot).toBe(2)
    expect(bySource.contracts).toBe(1)
  })
})
