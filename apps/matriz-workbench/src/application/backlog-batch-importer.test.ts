import { mkdtemp, mkdir, open, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
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

async function tree(root: string): Promise<string[]> {
  const walk = async (folder: string): Promise<string[]> => {
    const entries = await readdir(folder, { withFileTypes: true })
    return (await Promise.all(entries.map(async (entry) => {
      const target = path.join(folder, entry.name)
      if (entry.isDirectory()) return walk(target)
      return [`${path.relative(root, target)}:${(await stat(target)).size}`]
    }))).flat()
  }
  return (await walk(root)).sort()
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
  it("releases its own project lock after the callback", async () => {
    const { root, repository } = await fixture()
    const target = path.join(root, ".runtime", "workbench", "locks", "coordinator--batch-project-sample.lock")
    await repository.withBacklogBatchLock("sample", "batch-a", async () => undefined, 2)
    await expect(readFile(target, "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    await expect(repository.withBacklogBatchLock("sample", "batch-b", async () => "second", 2)).resolves.toBe("second")
  })

  it("retries a transient Windows receipt replacement without truncating the batch", async () => {
    const { root, repository } = await fixture()
    const target = path.join(root, "apps", "sample", ".matriz", "imports", "batch-a.json")
    await repository.writeImportReceipt("sample", "batch-a", { revision: 1 })
    const reader = await open(target, "r")
    const replacement = repository.writeImportReceipt("sample", "batch-a", { revision: 2 })
      .then(() => ({ ok: true as const }), (error: unknown) => ({ ok: false as const, error }))

    await new Promise((resolve) => setTimeout(resolve, 50))
    await reader.close()

    expect(await replacement).toEqual({ ok: true })
    expect(JSON.parse(await readFile(target, "utf8"))).toEqual({ revision: 2 })
  })
  it("reports a valid 50-item dry-run without changing any workspace artifact", async () => {
    const { root, repository } = await fixture()
    const beforeTree = await tree(root)
    const before = await readFile(path.join(root, "apps", "sample", ".matriz", "roadmap.json"), "utf8")

    const report = await importBacklogBatch(repository, plan(), "dry-run")

    expect(report).toMatchObject({ mode: "dry-run", valid: true, createdKeys: [], reusedKeys: [] })
    expect(await repository.listWorkItems("sample")).toEqual([])
    expect(await readFile(path.join(root, "apps", "sample", ".matriz", "roadmap.json"), "utf8")).toBe(before)
    expect(await tree(root)).toEqual(beforeTree)
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

  it("serializes different batches for one project", async () => {
    const { repository } = await fixture()
    const second = plan({ batchId: "wave-1-foundation-b" })

    await Promise.allSettled([importBacklogBatch(repository, plan(), "apply"), importBacklogBatch(repository, second, "apply")])

    expect(await repository.listWorkItems("sample")).toHaveLength(50)
  })

  it("reports keys not attempted after a create failure as skipped", async () => {
    const { repository } = await fixture()
    const originalCreate = repository.createWorkItem.bind(repository)
    let attempts = 0
    repository.createWorkItem = async (...args) => {
      attempts += 1
      if (attempts === 3) throw new Error("simulated create failure")
      return originalCreate(...args)
    }

    const report = await importBacklogBatch(repository, plan(), "apply")

    expect(report).toMatchObject({ failedKeys: ["item-03"], skippedKeys: plan().items.slice(3).map((item) => item.key) })
  })

  it("reports enrichment keys not attempted after an update failure as skipped", async () => {
    const { repository } = await fixture()
    const originalUpdate = repository.updateWorkItem.bind(repository)
    let attempts = 0
    repository.updateWorkItem = async (...args) => {
      attempts += 1
      if (attempts === 3) throw new Error("simulated enrichment failure")
      return originalUpdate(...args)
    }
    const report = await importBacklogBatch(repository, plan(), "apply")

    expect(report).toMatchObject({ failedKeys: ["item-03"], skippedKeys: plan().items.slice(3).map((item) => item.key) })
    expect(new Set([...report.failedKeys, ...report.skippedKeys, ...report.createdKeys, ...report.reusedKeys]).size).toBe(50)
  })

  it("recovers a persisted update without a second activity event", async () => {
    const { repository } = await fixture()
    const originalWrite = repository.writeImportReceipt.bind(repository)
    let writes = 0
    repository.writeImportReceipt = async (...args) => {
      writes += 1
      if (writes === 101) throw new Error("simulated receipt failure after update")
      await originalWrite(...args)
    }
    await importBacklogBatch(repository, plan(), "apply")
    repository.writeImportReceipt = originalWrite
    const first = (await repository.listWorkItems("sample")).find((item) => item.title === "Batch item 1")!
    const before = await repository.queryActivity("sample", { entityType: "backlog", entityId: first.id, limit: 500 })

    await importBacklogBatch(repository, plan(), "resume")

    expect(await repository.queryActivity("sample", { entityType: "backlog", entityId: first.id, limit: 500 })).toEqual(before)
  })

  it("rejects a receipt that points to a divergent work item", async () => {
    const { root, repository } = await fixture()
    await importBacklogBatch(repository, plan(), "apply")
    const receiptPath = path.join(root, "apps", "sample", ".matriz", "imports", "wave-1-foundation.json")
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as { entries: Record<string, { workItemId: string }> }
    receipt.entries["item-01"].workItemId = receipt.entries["item-02"].workItemId
    await writeFile(receiptPath, JSON.stringify(receipt))

    await expect(importBacklogBatch(repository, plan(), "resume")).rejects.toThrow()
  })

  it("does not adopt a pending item whose parent differs", async () => {
    const { repository } = await fixture()
    const originalCreate = repository.createWorkItem.bind(repository)
    let attempts = 0
    repository.createWorkItem = async (...args) => {
      attempts += 1
      if (attempts === 2) throw new Error("leave item-02 pending")
      return originalCreate(...args)
    }
    await importBacklogBatch(repository, plan(), "apply")
    repository.createWorkItem = originalCreate
    const unrelated = await repository.createWorkItem("sample", { kind: "outcome", title: "Unrelated", description: "", priority: "medium", productStatus: "discovery", validationStatus: "pending", humanReviewStatus: "not_required", documentationStatus: "pending" })
    await repository.createWorkItem("sample", { kind: "task", title: "Batch item 2", description: "Safe batch-import fixture.", priority: "medium", parentId: unrelated.id, tags: ["batch"], acceptanceCriteria: ["Has a verifiable result"], productStatus: "discovery", validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required" })

    await expect(importBacklogBatch(repository, plan(), "resume")).rejects.toThrow()
  })

  it("rejects an Inbox origin already converted in another project", async () => {
    const { root, repository } = await fixture()
    await mkdir(path.join(root, "apps", "another"), { recursive: true })
    await writeFile(path.join(root, "apps", "another", "package.json"), JSON.stringify({ name: "@matriz/app-another" }))
    await repository.initializeProject("another")
    await repository.createWorkItem("another", { kind: "task", title: "Elsewhere", description: "", priority: "medium", originRef: { kind: "inbox", id: "in_00000000-0000-4000-8000-000000000000" }, productStatus: "discovery", validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required" })
    const value = plan({ items: plan().items.map((item, index) => index === 0 ? { ...item, originRef: { kind: "inbox" as const, id: "in_00000000-0000-4000-8000-000000000000" } } : item) })

    await expect(importBacklogBatch(repository, value, "apply")).rejects.toThrow()
  })

  it("does not block on an abandoned partial legacy batch lock", async () => {
    const { root, repository } = await fixture()
    const locks = path.join(root, ".runtime", "workbench", "locks")
    await mkdir(locks, { recursive: true })
    await writeFile(path.join(locks, "coordinator--batch-project-sample.lock"), "")

    await expect(repository.withBacklogBatchLock("sample", "batch-a", async () => "recovered", 2)).resolves.toBe("recovered")
  })

  it("does not steal a live project batch lock", async () => {
    const { repository } = await fixture()
    let release!: () => void
    let entered!: () => void
    const active = new Promise<void>((resolve) => { entered = resolve })
    const blocked = new Promise<void>((resolve) => { release = resolve })
    const owner = repository.withBacklogBatchLock("sample", "batch-a", async () => {
      entered()
      await blocked
    }, 2)
    await active

    await expect(repository.withBacklogBatchLock("sample", "batch-a", async () => "stolen", 1)).rejects.toMatchObject({ code: "CONFLICT" })
    release()
    await owner
  })
})
