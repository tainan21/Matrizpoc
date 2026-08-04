import { describe, it, expect } from "vitest"
import {
  ALLOWED_INGEST_MODES_BY_SOURCE,
  DEFAULT_TRUST_BY_SOURCE,
  INSTITUTIONAL_CONTRACTS_VERSION,
  SOURCE_CLASSIFICATION_VALUES,
  TELEMETRY_CATEGORY_VALUES,
  evaluateTrustCoherence,
  isIngestModeAllowed,
  projectBrandIdentitySchema,
  projectHealthSnapshotSchema,
  projectEnvironmentSchema,
  observationMetaSchema,
  projectIntegrationCapabilitiesSchema,
  projectManifestSchema,
  projectMcpCapabilitiesSchema,
  projectPublicMetricsSchema,
  projectTelemetrySummarySchema,
  sourceClassificationSchema,
  trustLevelSchema,
} from "@matriz/integration-api-contracts/v1/institutional"

/**
 * Smoke test — Institutional Contracts (v1).
 *
 * L7 + L8 + L12. Estes contracts formam a camada institucional da V1.2.
 * Coexistem com os DTOs tecnicos (dtos.test.ts) sem substitui-los.
 */

const baseHealth = {
  status: "healthy" as const,
  readinessScore: 92,
  lastCheckAt: "2026-04-22T10:00:00.000Z",
  checks: [{ name: "auth", status: "pass" as const }],
}

const baseBrand = {
  brandName: "Spot",
  primaryColor: "#0a84ff",
  tone: "product" as const,
}

const baseCapabilities = {
  produces: [{ kind: "event" as const, name: "spot.gig.created" }],
  consumes: [],
  exposes: [{ kind: "page" as const, name: "Dashboard", path: "/dashboard" }],
  requires: [{ kind: "auth" as const, name: "otp" }],
}

const validSpotManifest = {
  projectId: "matriz:spot",
  displayName: "Spot",
  sourceType: "internal_monorepo_app" as const,
  trustLevel: "core" as const,
  ingestMode: "local_contract_import" as const,
  contractVersion: "v1" as const,
  brand: baseBrand,
  capabilities: baseCapabilities,
  health: baseHealth,
  institutionalTags: ["music", "saas"],
  ownership: { owner: "matriz-core" },
  links: [{ kind: "docs" as const, url: "https://matriz.dev/spot" }],
  ingestedAt: "2026-04-22T10:00:00.000Z",
}

describe("smoke: institutional contracts — version", () => {
  it("exposes v1 version tag", () => {
    expect(INSTITUTIONAL_CONTRACTS_VERSION).toBe("v1")
  })
})

describe("smoke: institutional contracts — SourceClassification", () => {
  it("enum covers the 6 canonical values", () => {
    expect(SOURCE_CLASSIFICATION_VALUES).toEqual([
      "internal_monorepo_app",
      "trusted_external_app",
      "legacy_app",
      "third_party_service",
      "mcp_source",
      "institutional_source",
    ])
  })

  it("rejects unknown classification", () => {
    expect(sourceClassificationSchema.safeParse("nonsense").success).toBe(false)
  })

  it("DEFAULT_TRUST_BY_SOURCE covers every sourceType", () => {
    for (const s of SOURCE_CLASSIFICATION_VALUES) {
      expect(trustLevelSchema.safeParse(DEFAULT_TRUST_BY_SOURCE[s]).success).toBe(true)
    }
  })

  it("ALLOWED_INGEST_MODES_BY_SOURCE has at least one mode per sourceType", () => {
    for (const s of SOURCE_CLASSIFICATION_VALUES) {
      expect(ALLOWED_INGEST_MODES_BY_SOURCE[s].length).toBeGreaterThan(0)
    }
  })

  it("isIngestModeAllowed enforces the matrix", () => {
    expect(isIngestModeAllowed("internal_monorepo_app", "local_contract_import")).toBe(true)
    expect(isIngestModeAllowed("internal_monorepo_app", "webhook_push")).toBe(false)
    expect(isIngestModeAllowed("institutional_source", "snapshot_pull")).toBe(true)
    expect(isIngestModeAllowed("third_party_service", "api_pull")).toBe(false)
  })
})

describe("smoke: institutional contracts — ProjectBrandIdentity", () => {
  it("accepts minimal brand", () => {
    expect(projectBrandIdentitySchema.safeParse(baseBrand).success).toBe(true)
  })

  it("rejects invalid color", () => {
    const r = projectBrandIdentitySchema.safeParse({
      ...baseBrand,
      primaryColor: "blueish",
    })
    expect(r.success).toBe(false)
  })
})

describe("smoke: institutional contracts — ProjectHealthSnapshot", () => {
  it("accepts healthy snapshot", () => {
    expect(projectHealthSnapshotSchema.safeParse(baseHealth).success).toBe(true)
  })

  it("rejects readiness out of range", () => {
    const r = projectHealthSnapshotSchema.safeParse({ ...baseHealth, readinessScore: 150 })
    expect(r.success).toBe(false)
  })
})

describe("smoke: institutional contracts — observation provenance", () => {
  it("accepts a stale declared observation with an explicit collection error", () => {
    const result = observationMetaSchema.safeParse({
      sourceId: "local:matriz-monorepo",
      nature: "declared",
      collectedAt: "2026-04-22T10:00:00.000Z",
      freshness: "stale",
      confidence: "unverified",
      lastError: {
        code: "health_not_observed",
        message: "No runtime check is configured.",
        occurredAt: "2026-04-22T10:00:00.000Z",
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects an observed value without observedAt", () => {
    const result = observationMetaSchema.safeParse({
      sourceId: "health:https",
      nature: "observed",
      collectedAt: "2026-04-22T10:00:00.000Z",
      freshness: "fresh",
      confidence: "verified",
    })

    expect(result.success).toBe(false)
  })
})

describe("smoke: institutional contracts — project environments", () => {
  it("accepts an observed local environment", () => {
    const result = projectEnvironmentSchema.safeParse({
      id: "local",
      kind: "local",
      label: "Local",
      url: "http://127.0.0.1:3001",
      status: "available",
      observation: {
        sourceId: "local:http",
        nature: "observed",
        observedAt: "2026-08-04T12:00:00.000Z",
        collectedAt: "2026-08-04T12:00:00.000Z",
        freshness: "fresh",
        confidence: "verified",
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects an available environment without an observed status", () => {
    const result = projectEnvironmentSchema.safeParse({
      id: "production",
      kind: "production",
      label: "Production",
      status: "available",
      observation: {
        sourceId: "manifest",
        nature: "declared",
        collectedAt: "2026-08-04T12:00:00.000Z",
        freshness: "unknown",
        confidence: "unverified",
      },
    })

    expect(result.success).toBe(false)
  })
})

describe("smoke: institutional contracts — ProjectPublicMetrics", () => {
  it("accepts empty metrics", () => {
    expect(projectPublicMetricsSchema.safeParse({}).success).toBe(true)
  })

  it("rejects negative users", () => {
    expect(projectPublicMetricsSchema.safeParse({ activeUsers: -1 }).success).toBe(false)
  })
})

describe("smoke: institutional contracts — ProjectIntegrationCapabilities", () => {
  it("accepts populated capabilities", () => {
    expect(projectIntegrationCapabilitiesSchema.safeParse(baseCapabilities).success).toBe(true)
  })

  it("rejects unknown integration kind", () => {
    const r = projectIntegrationCapabilitiesSchema.safeParse({
      produces: [{ kind: "signal", name: "x" }],
      consumes: [],
      exposes: [],
      requires: [],
    })
    expect(r.success).toBe(false)
  })
})

describe("smoke: institutional contracts — ProjectTelemetrySummary", () => {
  it("accepts summary with 6 categories", () => {
    const summary = {
      window: "24h" as const,
      categories: Object.fromEntries(
        TELEMETRY_CATEGORY_VALUES.map((c) => [c, { count: 0 }]),
      ),
      topEvents: [],
    }
    expect(projectTelemetrySummarySchema.safeParse(summary).success).toBe(true)
  })
})

describe("smoke: institutional contracts — ProjectMcpCapabilities", () => {
  it("accepts declared MCP with no tools", () => {
    expect(
      projectMcpCapabilitiesSchema.safeParse({ status: "declared" }).success,
    ).toBe(true)
  })
})

describe("smoke: institutional contracts — ProjectManifest", () => {
  it("accepts valid internal_monorepo_app manifest", () => {
    const r = projectManifestSchema.safeParse(validSpotManifest)
    expect(r.success).toBe(true)
  })

  it("rejects invalid projectId format", () => {
    const r = projectManifestSchema.safeParse({
      ...validSpotManifest,
      projectId: "BadId",
    })
    expect(r.success).toBe(false)
  })

  it("rejects disallowed sourceType x ingestMode combination", () => {
    const r = projectManifestSchema.safeParse({
      ...validSpotManifest,
      ingestMode: "webhook_push",
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("ingestMode"))).toBe(true)
    }
  })

  it("accepts institutional_source + snapshot_pull", () => {
    const r = projectManifestSchema.safeParse({
      ...validSpotManifest,
      projectId: "ventures:matriz-ventures-registry",
      displayName: "Matriz Ventures Registry",
      sourceType: "institutional_source",
      trustLevel: "trusted",
      ingestMode: "snapshot_pull",
      brand: { ...baseBrand, brandName: "Matriz Ventures", tone: "institutional" },
    })
    expect(r.success).toBe(true)
  })
})

describe("smoke: institutional contracts — trust coherence", () => {
  it("core trust is ok for internal_monorepo_app", () => {
    expect(evaluateTrustCoherence("internal_monorepo_app", "core")).toBe("ok")
  })

  it("experimental trust warns for internal_monorepo_app", () => {
    expect(evaluateTrustCoherence("internal_monorepo_app", "experimental")).toBe("warn")
  })

  it("unknown trust fails for institutional_source", () => {
    expect(evaluateTrustCoherence("institutional_source", "unknown")).toBe("fail")
  })
})
