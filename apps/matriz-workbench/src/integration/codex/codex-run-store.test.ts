import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { CodexRunStore } from "./codex-run-store"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-codex-run-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sample", ".matriz", "agents"), {
    recursive: true,
  })
  return { root, store: new CodexRunStore(root) }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("CodexRunStore", () => {
  it("persists a bounded run record inside the selected workspace", async () => {
    const { store } = await fixture()
    const timestamp = new Date().toISOString()
    const requestId = "req_11111111-1111-4111-8111-111111111111"
    const record = await store.write({
      schemaVersion: 1,
      projectId: "sample",
      requestId,
      backlogItemId: "tsk_22222222-2222-4222-8222-222222222222",
      status: "running",
      latestMessage: "Implementando a tarefa.",
      plan: [{ step: "Validar o escopo", status: "completed" }],
      commands: [],
      changedFiles: [],
      checks: [],
      approvals: [],
      diff: "",
      startedAt: timestamp,
    })

    expect(record.revision).toHaveLength(16)
    await expect(store.read("sample", requestId)).resolves.toEqual(record)
  })

  it("rejects arbitrary request and project paths", async () => {
    const { store } = await fixture()
    await expect(store.read("../sample", "req_invalid")).rejects.toMatchObject({
      code: "INVALID_PATH",
    })
    await expect(
      store.read("sample", "req_11111111-1111-4111-8111-111111111111/../../secret"),
    ).rejects.toMatchObject({ code: "INVALID_PATH" })
  })

  it("rejects corrupted persisted state", async () => {
    const { root, store } = await fixture()
    const requestId = "req_33333333-3333-4333-8333-333333333333"
    const runs = path.join(root, "apps", "sample", ".matriz", "agents", "runs")
    await mkdir(runs)
    await writeFile(path.join(runs, `${requestId}.json`), '{"status":"running"}')

    await expect(store.read("sample", requestId)).rejects.toBeDefined()
  })
})
