import { describe, it, expect, beforeEach } from "vitest"
import {
  createInstitutionalRegistry,
  getGlobalInstitutionalRegistry,
  INSTITUTIONAL_REGISTRY_VERSION,
  type InstitutionalRegistry,
} from "@matriz/integration-registry-core/institutional"
import type { ProjectManifest } from "@matriz/integration-api-contracts/v1/institutional"

const nowIso = "2026-04-22T10:00:00.000Z"

function makeProject(
  overrides: Partial<ProjectManifest> & Pick<ProjectManifest, "projectId">,
): ProjectManifest {
  return {
    projectId: overrides.projectId,
    displayName: overrides.displayName ?? "Sample",
    sourceType: overrides.sourceType ?? "internal_monorepo_app",
    trustLevel: overrides.trustLevel ?? "core",
    ingestMode: overrides.ingestMode ?? "local_contract_import",
    contractVersion: "v1",
    brand: overrides.brand ?? {
      brandName: "Sample",
      primaryColor: "#000000",
      tone: "product",
    },
    capabilities: overrides.capabilities ?? {
      produces: [],
      consumes: [],
      exposes: [],
      requires: [],
    },
    health: overrides.health ?? {
      status: "healthy",
      readinessScore: 90,
      lastCheckAt: nowIso,
      checks: [],
    },
    institutionalTags: overrides.institutionalTags ?? [],
    ownership: overrides.ownership ?? { owner: "matriz-core" },
    links: overrides.links ?? [],
    ingestedAt: nowIso,
    metrics: overrides.metrics,
    telemetry: overrides.telemetry,
    mcp: overrides.mcp,
  }
}

describe("smoke: InstitutionalRegistry — version", () => {
  it("exposes version", () => {
    expect(INSTITUTIONAL_REGISTRY_VERSION).toBe("1.0.0")
  })
})

describe("smoke: InstitutionalRegistry — replaceAll", () => {
  let reg: InstitutionalRegistry
  beforeEach(() => {
    reg = createInstitutionalRegistry()
  })

  it("accepts valid projects and sets lastReplacedAt", () => {
    const r = reg.replaceAll([
      makeProject({ projectId: "matriz:spot", displayName: "Spot" }),
      makeProject({ projectId: "matriz:seumei", displayName: "Seumei" }),
    ])
    expect(r.accepted).toBe(2)
    expect(r.rejected).toHaveLength(0)
    expect(reg.list()).toHaveLength(2)
    expect(reg.lastReplacedAt()).toBeDefined()
  })

  it("rejects invalid and keeps valid", () => {
    const bad = { projectId: "BAD" } as unknown as ProjectManifest
    const r = reg.replaceAll([makeProject({ projectId: "matriz:spot" }), bad])
    expect(r.accepted).toBe(1)
    expect(r.rejected).toHaveLength(1)
  })

  it("replaceAll is atomic (old state is gone)", () => {
    reg.replaceAll([makeProject({ projectId: "matriz:spot" })])
    reg.replaceAll([makeProject({ projectId: "matriz:seumei" })])
    expect(reg.list().map((p) => p.projectId)).toEqual(["matriz:seumei"])
  })
})

describe("smoke: InstitutionalRegistry — queries", () => {
  let reg: InstitutionalRegistry
  beforeEach(() => {
    reg = createInstitutionalRegistry()
    reg.replaceAll([
      makeProject({ projectId: "matriz:spot", institutionalTags: ["music", "public"] }),
      makeProject({
        projectId: "ventures:north-star-labs",
        sourceType: "institutional_source",
        trustLevel: "trusted",
        ingestMode: "snapshot_pull",
        institutionalTags: ["venture", "public"],
      }),
      makeProject({
        projectId: "legacy:booking-crm",
        sourceType: "legacy_app",
        trustLevel: "external",
        ingestMode: "snapshot_pull",
        institutionalTags: ["legacy"],
        health: {
          status: "degraded",
          readinessScore: 60,
          lastCheckAt: nowIso,
          checks: [],
        },
      }),
    ])
  })

  it("findBySourceType", () => {
    expect(reg.findBySourceType("internal_monorepo_app")).toHaveLength(1)
    expect(reg.findBySourceType("institutional_source")).toHaveLength(1)
    expect(reg.findBySourceType("legacy_app")).toHaveLength(1)
  })

  it("findByTrustLevel", () => {
    expect(reg.findByTrustLevel("core")).toHaveLength(1)
    expect(reg.findByTrustLevel("trusted")).toHaveLength(1)
    expect(reg.findByTrustLevel("external")).toHaveLength(1)
  })

  it("findByHealthStatus", () => {
    expect(reg.findByHealthStatus("healthy")).toHaveLength(2)
    expect(reg.findByHealthStatus("degraded")).toHaveLength(1)
  })

  it("findByTag", () => {
    expect(reg.findByTag("public")).toHaveLength(2)
    expect(reg.findByTag("legacy")).toHaveLength(1)
  })

  it("publicView filters by trust/tag rules", () => {
    // core (spot) — sempre; trusted (ventures) — sempre; external (legacy) — so se tag "public"
    expect(reg.publicView().map((p) => p.projectId).sort()).toEqual([
      "matriz:spot",
      "ventures:north-star-labs",
    ])
  })

  it("stats computes counts and avg readiness", () => {
    const s = reg.stats()
    expect(s.total).toBe(3)
    expect(s.bySourceType.internal_monorepo_app).toBe(1)
    expect(s.bySourceType.institutional_source).toBe(1)
    expect(s.bySourceType.legacy_app).toBe(1)
    expect(s.byTrustLevel.core).toBe(1)
    expect(s.byHealthStatus.healthy).toBe(2)
    expect(s.avgReadinessScore).toBe(Math.round((90 + 90 + 60) / 3))
  })
})

describe("smoke: InstitutionalRegistry — global singleton", () => {
  it("returns same instance", () => {
    const a = getGlobalInstitutionalRegistry()
    const b = getGlobalInstitutionalRegistry()
    expect(a).toBe(b)
  })
})
