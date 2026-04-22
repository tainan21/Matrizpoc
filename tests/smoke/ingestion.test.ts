import { describe, it, expect } from "vitest"
import {
  createIngestionPipeline,
  createLocalContractImportAdapter,
  createSnapshotPullAdapter,
  createStaticSeedAdapter,
  createApiPullAdapter,
  createWebhookPushAdapter,
  createManualRegistrationAdapter,
  NotImplementedIngestionError,
} from "@matriz/integration-ingestion"
import type { ProjectManifest } from "@matriz/integration-api-contracts/v1/institutional"
import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import { manifest as spotManifest } from "@apps/spot/public-contract"

const nowIso = "2026-04-22T10:00:00.000Z"

const baseBrand = {
  brandName: "Spot",
  primaryColor: "#0a84ff" as const,
  tone: "product" as const,
}

const validVenturesProject: ProjectManifest = {
  projectId: "ventures:north-star-labs",
  displayName: "North Star Labs",
  sourceType: "institutional_source",
  trustLevel: "trusted",
  ingestMode: "snapshot_pull",
  contractVersion: "v1",
  brand: {
    brandName: "North Star Labs",
    primaryColor: "#d97706",
    tone: "institutional",
  },
  capabilities: { produces: [], consumes: [], exposes: [], requires: [] },
  health: {
    status: "healthy",
    readinessScore: 88,
    lastCheckAt: nowIso,
    checks: [],
  },
  institutionalTags: ["public", "venture"],
  ownership: { owner: "matriz-ventures" },
  links: [],
  ingestedAt: nowIso,
}

describe("smoke: ingestion — StaticSeedAdapter", () => {
  it("ingests valid seeds and flags invalid ones", async () => {
    const invalid = { ...validVenturesProject, projectId: "BAD" } as unknown as ProjectManifest
    const adapter = createStaticSeedAdapter({
      id: "test.static",
      seeds: [validVenturesProject, invalid],
    })
    const r = await adapter.ingest({
      now: new Date(nowIso),
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    })
    expect(r.projects).toHaveLength(1)
    expect(r.errors).toHaveLength(1)
    expect(r.mode).toBe("static_seed")
  })
})

describe("smoke: ingestion — SnapshotPullAdapter", () => {
  it("ingests snapshot v1 payload", async () => {
    const adapter = createSnapshotPullAdapter({
      id: "test.snapshot",
      sourceHint: "memory://ventures",
      fetchSnapshot: async () => ({ version: "v1", projects: [validVenturesProject] }),
    })
    const r = await adapter.ingest({
      now: new Date(nowIso),
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    })
    expect(r.projects).toHaveLength(1)
    expect(r.errors).toHaveLength(0)
  })

  it("rejects snapshot with wrong shape", async () => {
    const adapter = createSnapshotPullAdapter({
      id: "test.snapshot",
      sourceHint: "memory://bad",
      fetchSnapshot: async () => ({ version: "v0", data: "x" }),
    })
    const r = await adapter.ingest({
      now: new Date(nowIso),
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    })
    expect(r.projects).toHaveLength(0)
    expect(r.errors[0]?.message).toContain("snapshot shape invalid")
  })

  it("captures fetch errors", async () => {
    const adapter = createSnapshotPullAdapter({
      id: "test.snapshot",
      sourceHint: "memory://fail",
      fetchSnapshot: async () => {
        throw new Error("boom")
      },
    })
    const r = await adapter.ingest({
      now: new Date(nowIso),
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    })
    expect(r.projects).toHaveLength(0)
    expect(r.errors[0]?.message).toContain("boom")
  })
})

describe("smoke: ingestion — LocalContractImportAdapter", () => {
  it("derives institutional manifest from real AppManifestDTO (spot)", async () => {
    const m: AppManifestDTO = spotManifest
    const adapter = createLocalContractImportAdapter({
      id: "test.local",
      apps: [
        {
          manifest: m,
          decoration: {
            projectId: "matriz:spot",
            brand: baseBrand,
            ownership: { owner: "matriz-spot" },
            institutionalTags: ["music"],
          },
        },
      ],
    })
    const r = await adapter.ingest({
      now: new Date(nowIso),
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    })
    expect(r.projects).toHaveLength(1)
    const p = r.projects[0]!
    expect(p.sourceType).toBe("internal_monorepo_app")
    expect(p.ingestMode).toBe("local_contract_import")
    expect(p.capabilities.produces.length).toBeGreaterThan(0)
    expect(p.capabilities.exposes.length).toBe(m.routes.length)
  })
})

describe("smoke: ingestion — scaffolds throw", () => {
  it("api_pull throws NotImplementedIngestionError", async () => {
    const adapter = createApiPullAdapter({
      id: "test.api",
      supports: ["trusted_external_app"],
    })
    await expect(
      adapter.ingest({
        now: new Date(nowIso),
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      }),
    ).rejects.toBeInstanceOf(NotImplementedIngestionError)
  })

  it("webhook_push throws", async () => {
    const adapter = createWebhookPushAdapter({
      id: "test.webhook",
      supports: ["trusted_external_app"],
    })
    await expect(
      adapter.ingest({
        now: new Date(nowIso),
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      }),
    ).rejects.toBeInstanceOf(NotImplementedIngestionError)
  })

  it("manual_registration throws", async () => {
    const adapter = createManualRegistrationAdapter({
      id: "test.manual",
      supports: ["legacy_app"],
    })
    await expect(
      adapter.ingest({
        now: new Date(nowIso),
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      }),
    ).rejects.toBeInstanceOf(NotImplementedIngestionError)
  })
})

describe("smoke: ingestion — pipeline", () => {
  it("aggregates results and isolates adapter failures", async () => {
    const good = createStaticSeedAdapter({
      id: "pipe.good",
      seeds: [validVenturesProject],
    })
    const bad = createApiPullAdapter({
      id: "pipe.bad",
      supports: ["trusted_external_app"],
    })

    const pipeline = createIngestionPipeline({ adapters: [good, bad] })
    const run = await pipeline.run({ now: new Date(nowIso) })

    expect(run.projects).toHaveLength(1)
    expect(run.errors.length).toBeGreaterThan(0)
    expect(run.errors.some((e) => e.adapterId === "pipe.bad")).toBe(true)
  })
})
