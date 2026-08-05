import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  importBacklogBatch,
  type BacklogBatchPlan,
} from "./backlog-batch-importer"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-workbench-batch-"))
  roots.push(root)
  await writeFile(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n')
  await mkdir(path.join(root, "apps", "sample"), { recursive: true })
  await writeFile(path.join(root, "apps", "sample", "package.json"), JSON.stringify({ name: "@matriz/app-sample" }))
  await writeFile(path.join(root, "README.md"), "# Repository\n")
  const repository = await WorkspaceRepository.create(root)
  await repository.initializeProject("sample")
  return { root, repository }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

function plan(overrides: Partial<BacklogBatchPlan> = {}): BacklogBatchPlan {
  const items = Array.from({ length: 50 }, (_, index) => ({
    key: `item-${String(index + 1).padStart(2, "0")}`,
    kind: index === 0 ? "outcome" as const : "task" as const,
    title: `Batch item ${index + 1}`,
    description: "Safe batch-import fixture.",
    priority: "medium" as const,
    parentKey: index === 0 ? undefined : "item-01",
    dependencies: index > 0 ? ["item-01"] : [],
    tags: ["batch"],
    acceptanceCriteria: ["Has a verifiable result"],
    references: [{ kind: "repository_file" as const, path: "README.md" }],
  }))
  return {
    schemaVersion: 1,
    batchId: "wave-1-foundation",
    projectId: "sample",
    expectedCount: 50,
    items,
    ...overrides,
  }
}

describe("importBacklogBatch", () => {
  it("reports a valid 50-item dry-run without changing any workspace artifact", async () => {
    const { root, repository } = await fixture()
    const before = await readFile(path.join(root, "apps", "sample", ".matriz", "roadmap.json"), "utf8")

    const report = await importBacklogBatch(repository, plan(), "dry-run")

    expect(report).toMatchObject({ mode: "dry-run", valid: true, createdKeys: [], reusedKeys: [] })
    expect(await repository.listWorkItems("sample")).toEqual([])
    expect(await readFile(path.join(root, "apps", "sample", ".matriz", "roadmap.json"), "utf8")).toBe(before)
    await expect(readFile(path.join(root, "apps", "sample", ".matriz", "imports", "wave-1-foundation.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
  })

  it.each([
    ["count mismatch", (value: BacklogBatchPlan) => ({ ...value, expectedCount: 49 })],
    ["item total mismatch", (value: BacklogBatchPlan) => ({ ...value, items: value.items.slice(0, 49) })],
    ["duplicate key", (value: BacklogBatchPlan) => ({ ...value, items: [...value.items.slice(0, 49), { ...value.items[49], key: "item-01" }] })],
    ["duplicate normalized title", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 1 ? { ...item, title: " batch\u00a0item 1 " } : item) })],
    ["missing parent", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 1 ? { ...item, parentKey: "missing" } : item) })],
    ["parent cycle", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 0 ? { ...item, kind: "task" as const, parentKey: "item-02" } : index === 1 ? { ...item, parentKey: "item-01" } : item) })],
    ["missing dependency", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 1 ? { ...item, dependencies: ["missing"] } : item) })],
    ["dependency cycle", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 0 ? { ...item, dependencies: ["item-02"] } : index === 1 ? { ...item, dependencies: ["item-01"] } : item) })],
    ["missing file reference", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 0 ? { ...item, references: [{ kind: "repository_file" as const, path: "missing.md" }] } : item) })],
    ["missing workbench document", (value: BacklogBatchPlan) => ({ ...value, items: value.items.map((item, index) => index === 0 ? { ...item, references: [{ kind: "workbench_document" as const, documentId: "doc_00000000-0000-4000-8000-000000000000" }] } : item) })],
  ])("rejects %s before writing", async (_name, transform) => {
    const { repository } = await fixture()
    await expect(importBacklogBatch(repository, transform(plan()), "apply")).rejects.toThrow()
    expect(await repository.listWorkItems("sample")).toEqual([])
  })

  it("rejects a normalized title collision against V1, V2, and archived work", async () => {
    const { repository } = await fixture()
    const legacy = await repository.createBacklogItem("sample", { title: "Batch item 1", description: "", priority: "medium", tags: [] })
    await expect(importBacklogBatch(repository, plan(), "apply")).rejects.toThrow()
    expect(legacy.schemaVersion).toBe(1)
  })

  it("rejects a normalized collision with archived V2 work", async () => {
    const { repository } = await fixture()
    const existing = await repository.createWorkItem("sample", {
      kind: "task", title: "  BATCH\u00a0ITEM 1 ", description: "", priority: "medium",
      productStatus: "discovery", validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required",
    })
    const archived = await repository.updateWorkItem("sample", existing.id, {
      productStatus: "archived", archive: { reason: "Retained for audit", actor: "human", archivedAt: "2026-08-05T00:00:00.000Z" },
    }, existing.revision)
    await expect(importBacklogBatch(repository, plan(), "apply")).rejects.toThrow()
    expect(archived.productStatus).toBe("archived")
  })

  it("rejects an unresolved Inbox origin key before writing", async () => {
    const { root, repository } = await fixture()
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "matriz" }))
    await repository.initializeProject("matriz-infra-hub")
    await repository.createInboxItem({
      title: "Existing provenance", detail: "", origin: "codex_suggestion", originKey: "wave-1:item-01",
    })
    const value = plan({ items: plan().items.map((item, index) => index === 0 ? { ...item, originKey: "wave-1:item-01" } : item) })

    await expect(importBacklogBatch(repository, value, "apply")).rejects.toThrow()
    expect(await repository.listWorkItems("sample")).toEqual([])
  })

  it("creates 50 V2 items with defaults, hierarchy, dependencies and context references", async () => {
    const { repository } = await fixture()

    const report = await importBacklogBatch(repository, plan(), "apply")
    const items = await repository.listWorkItems("sample")
    const outcome = items.find((item) => item.title === "Batch item 1")!
    const child = items.find((item) => item.title === "Batch item 2")!

    expect(report.createdKeys).toHaveLength(50)
    expect(items).toHaveLength(50)
    expect(outcome).toMatchObject({ schemaVersion: 2, kind: "outcome", productStatus: "discovery", validationStatus: "pending", humanReviewStatus: "not_required", documentationStatus: "pending" })
    expect(child).toMatchObject({ parentId: outcome.id, validationStatus: "not_required", documentationStatus: "not_required", references: [{ kind: "repository_file", path: "README.md" }] })
    expect(child.dependencyIds).toEqual([outcome.id])
  })

  it("is idempotent on a second apply and resume", async () => {
    const { repository } = await fixture()
    await importBacklogBatch(repository, plan(), "apply")
    const second = await importBacklogBatch(repository, plan(), "apply")
    const resumed = await importBacklogBatch(repository, plan(), "resume")

    expect(second.createdKeys).toEqual([])
    expect(second.reusedKeys).toHaveLength(50)
    expect(resumed.createdKeys).toEqual([])
    expect(await repository.listWorkItems("sample")).toHaveLength(50)
  })

  it("resumes after a partial create failure without duplicating completed work", async () => {
    const { repository } = await fixture()
    const originalCreate = repository.createWorkItem.bind(repository)
    let attempts = 0
    repository.createWorkItem = async (...args) => {
      attempts += 1
      if (attempts === 3) throw new Error("simulated write failure")
      return originalCreate(...args)
    }

    const partial = await importBacklogBatch(repository, plan(), "apply")
    repository.createWorkItem = originalCreate
    const resumed = await importBacklogBatch(repository, plan(), "resume")

    expect(partial).toMatchObject({ createdKeys: ["item-01", "item-02"], failedKeys: ["item-03"] })
    expect(resumed).toMatchObject({ createdKeys: expect.arrayContaining(["item-03"]), reusedKeys: ["item-01", "item-02"] })
    expect(await repository.listWorkItems("sample")).toHaveLength(50)
  })

  it("adopts an item when receipt persistence fails after creation", async () => {
    const { repository } = await fixture()
    const originalWrite = repository.writeImportReceipt.bind(repository)
    let writes = 0
    repository.writeImportReceipt = async (...args) => {
      writes += 1
      if (writes === 2) {
        throw new Error("simulated receipt failure")
      }
      await originalWrite(...args)
    }

    const partial = await importBacklogBatch(repository, plan(), "apply")
    repository.writeImportReceipt = originalWrite
    const resumed = await importBacklogBatch(repository, plan(), "resume")

    expect(partial.failedKeys).toEqual(["item-01"])
    expect(resumed.createdKeys).toHaveLength(49)
    expect(await repository.listWorkItems("sample")).toHaveLength(50)
  })

  it("serializes concurrent apply operations for the same batch", async () => {
    const { repository } = await fixture()

    await Promise.all([importBacklogBatch(repository, plan(), "apply"), importBacklogBatch(repository, plan(), "resume")])

    expect(await repository.listWorkItems("sample")).toHaveLength(50)
  })
})
