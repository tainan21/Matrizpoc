import { describe, it, expect } from "vitest"
import {
  createContractFromGigInputSchema,
  createContractFromEstablishmentInputSchema,
  sharedOnboardingPayloadSchema,
  externalLinkSchema,
  telemetryEventSchema,
  appManifestSchema,
  appIdSchema,
} from "@matriz/integration-api-contracts"
import { monorepoConfig } from "@matriz/platform-config"

/**
 * Smoke test — DTOs publicos (L7 + L8)
 */
describe("smoke: dtos", () => {
  it("registers Matriz Admin and keeps Seumei on its dedicated port", () => {
    expect(appIdSchema.parse("matriz-admin")).toBe("matriz-admin")
    expect(monorepoConfig.baseUrls["matriz-admin"]).toBe("http://localhost:3002")
    expect(monorepoConfig.baseUrls.seumei).toBe("http://localhost:3008")
  })

  it("CreateContractFromGigInput: valid sample parses", () => {
    const sample = {
      tenantId: "tenant-acme",
      gig: {
        id: "gig-1",
        tenantId: "tenant-acme",
        title: "Show na Matriz",
        venueName: "Casa da Matriz",
        startsAt: "2026-05-10T20:00:00.000Z",
        endsAt: "2026-05-10T23:00:00.000Z",
        bandName: "The Samples",
        feeAmount: 1500,
        currency: "BRL",
      },
      counterpartyName: "Casa da Matriz Ltda",
      counterpartyRole: "Venue",
    }
    const r = createContractFromGigInputSchema.safeParse(sample)
    expect(r.success).toBe(true)
  })

  it("CreateContractFromGigInput: invalid sample rejects", () => {
    const bad = { tenantId: "t", gig: { id: "x" } }
    const r = createContractFromGigInputSchema.safeParse(bad)
    expect(r.success).toBe(false)
  })

  it("CreateContractFromEstablishmentInput: valid sample parses", () => {
    const sample = {
      tenantId: "tenant-acme",
      establishment: {
        id: "est-1",
        tenantId: "tenant-acme",
        name: "Bar Central",
        type: "bar",
        address: "Rua X, 42",
        ownerName: "Joana",
        serviceRadiusKm: 3,
      },
      counterpartyName: "Fornecedor Y",
      counterpartyRole: "Provider",
      serviceDescription: "Fornecimento mensal de insumos.",
    }
    const r = createContractFromEstablishmentInputSchema.safeParse(sample)
    expect(r.success).toBe(true)
  })

  it("SharedOnboardingPayload: valid sample parses", () => {
    const sample = {
      tenantId: "tenant-acme",
      tenant: { tenantName: "Acme", country: "BR" },
      branding: { primaryColor: "#111", logoText: "Acme" },
      enabledApps: ["spot", "contracts"],
      operation: { timezone: "America/Sao_Paulo", currency: "BRL", defaultLanguage: "pt" },
      startedAt: "2026-04-20T10:00:00.000Z",
    }
    const r = sharedOnboardingPayloadSchema.safeParse(sample)
    expect(r.success).toBe(true)
  })

  it("ExternalLinkDTO: valid sample parses", () => {
    const sample = {
      id: "xlink-1",
      tenantId: "tenant-acme",
      localApp: "contracts",
      localEntityType: "contract",
      localEntityId: "contract-1",
      externalApp: "spot",
      externalEntityType: "gig",
      externalEntityId: "gig-1",
      relationType: "contract.source",
      snapshot: { gigTitle: "Show na Matriz" },
      createdAt: "2026-04-20T10:00:00.000Z",
    }
    const r = externalLinkSchema.safeParse(sample)
    expect(r.success).toBe(true)
  })

  it("TelemetryEventDTO: valid sample parses with version v1", () => {
    const sample = {
      id: "tel-1",
      version: "v1",
      appId: "spot",
      tenantId: "tenant-acme",
      name: "gig.viewed",
      occurredAt: "2026-04-20T10:00:00.000Z",
      properties: { gigId: "gig-1" },
    }
    const r = telemetryEventSchema.safeParse(sample)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.version).toBe("v1")
  })

  it("AppManifestDTO: valid sample parses", () => {
    const sample = {
      appId: "spot",
      name: "Spot",
      description: "Bandas e gigs.",
      version: "1.0.0",
      contractVersion: "v1",
      routes: [{ label: "Home", path: "/", order: 1 }],
      primaryRoute: "/",
      capabilities: [{ id: "spot.gig.read", name: "Ler gigs", description: "Leitura de gigs." }],
      eventsProduced: ["spot.gig.created"],
      eventsConsumed: ["contract.created"],
      integrations: [
        { targetAppId: "contracts", kind: "gateway", description: "Cria contratos a partir de gig." },
      ],
      onboardingSupport: { participates: true, hasSpecificStep: true, specificStepTitle: "Perfil artistico" },
      navigationEntry: { label: "Spot", path: "/", order: 2 },
      ownership: { domainSummary: "Artistas/gigs", maintainers: [] },
    }
    const r = appManifestSchema.safeParse(sample)
    expect(r.success).toBe(true)
  })
})
