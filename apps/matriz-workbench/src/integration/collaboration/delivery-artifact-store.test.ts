import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { DeliveryArtifactStore } from "./delivery-artifact-store"

const roots: string[] = []
const taskId = "tsk_11111111-1111-4111-8111-111111111111"
const requestId = "req_22222222-2222-4222-8222-222222222222"

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-artifact-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sample", ".matriz"), { recursive: true })
  return new DeliveryArtifactStore(root)
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("DeliveryArtifactStore", () => {
  it("persists a GitHub pull request with immutable commit evidence", async () => {
    const store = await fixture()
    const receipt = await store.recordPullRequest({
      projectId: "sample",
      backlogItemId: taskId,
      requestId,
      url: "https://github.com/matriz/sample/pull/42?source=workbench",
      baseBranch: "main",
      headBranch: "feat/workbench",
      headCommit: "A".repeat(40),
      checks: ["pnpm test"],
    })

    expect(receipt.externalId).toBe("42")
    expect(receipt.headCommit).toBe("a".repeat(40))
    expect(receipt.url).toBe("https://github.com/matriz/sample/pull/42")
    await expect(store.readPullRequest("sample", requestId)).resolves.toEqual(receipt)
  })

  it("accepts a Vercel preview and rejects an unrelated host", async () => {
    const store = await fixture()
    const receipt = await store.recordPreview({
      projectId: "sample",
      backlogItemId: taskId,
      requestId,
      deploymentId: "dpl_123",
      url: "https://matriz-workbench-git-feature.vercel.app",
      environment: "preview",
      sourceCommit: "b".repeat(40),
      state: "ready",
    })

    expect(receipt.state).toBe("ready")
    await expect(store.readPreview("sample", requestId)).resolves.toEqual(receipt)
    await expect(store.recordPreview({
      projectId: "sample",
      backlogItemId: taskId,
      requestId: "req_33333333-3333-4333-8333-333333333333",
      deploymentId: "dpl_evil",
      url: "https://example.com",
      environment: "preview",
      sourceCommit: "c".repeat(40),
      state: "ready",
    })).rejects.toMatchObject({ code: "INVALID_DATA" })
  })

  it("rejects stale artifact updates", async () => {
    const store = await fixture()
    const receipt = await store.recordPullRequest({
      projectId: "sample",
      backlogItemId: taskId,
      requestId,
      url: "https://github.com/matriz/sample/pull/7",
      baseBranch: "main",
      headBranch: "feat/a",
      headCommit: "d".repeat(40),
      checks: ["pnpm test"],
    })
    await expect(store.recordPullRequest({
      projectId: "sample",
      backlogItemId: taskId,
      requestId,
      url: "https://github.com/matriz/sample/pull/8",
      baseBranch: "main",
      headBranch: "feat/b",
      headCommit: "e".repeat(40),
      checks: ["pnpm test"],
      expectedRevision: `${receipt.revision}-stale`,
    })).rejects.toMatchObject({ code: "CONFLICT" })
  })
})
