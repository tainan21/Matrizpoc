import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ControlDiagnosticRepository } from "./control-diagnostic-repository"

const roots: string[] = []
const input = {
  projectId: "demo",
  actionId: "test" as const,
  sessionId: "term_123",
  status: "failed" as const,
  exitCode: 1,
  lines: ["FAIL runtime"],
  occurredAt: "2026-08-25T18:00:00.000Z",
  fingerprint: "a".repeat(64),
}

async function repository() {
  const root = await mkdtemp(path.join(tmpdir(), "matriz-diagnostics-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "demo", ".matriz"), { recursive: true })
  return { root, repository: new ControlDiagnosticRepository(root) }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe("ControlDiagnosticRepository", () => {
  it("creates one diagnostic and deduplicates repeated evidence atomically", async () => {
    const { root, repository: store } = await repository()
    const first = await store.record(input)
    const duplicate = await store.record({ ...input, sessionId: "term_456", occurredAt: "2026-08-25T18:05:00.000Z" })

    expect(first.created).toBe(true)
    expect(duplicate.created).toBe(false)
    expect(duplicate.diagnostic).toMatchObject({ occurrences: 2, latestSessionId: "term_456", state: "open" })
    const persisted = JSON.parse(await readFile(path.join(root, "apps", "demo", ".matriz", "diagnostics", `${input.fingerprint}.json`), "utf8"))
    expect(persisted).toEqual(duplicate.diagnostic)
  })

  it("serializes concurrent duplicate reports without losing occurrences", async () => {
    const { repository: store } = await repository()
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => store.record({ ...input, sessionId: `term_${index}` })))

    expect(results.filter((result) => result.created)).toHaveLength(1)
    expect((await store.get("demo", input.fingerprint)).occurrences).toBe(8)
  })

  it("rejects project traversal before touching the filesystem", async () => {
    const { repository: store } = await repository()
    await expect(store.record({ ...input, projectId: "../outside" })).rejects.toThrow("Invalid project")
  })

  it("updates lifecycle state only from the expected revision", async () => {
    const { repository: store } = await repository()
    const created = await store.record(input)

    const repairing = await store.update(
      "demo",
      input.fingerprint,
      created.diagnostic.revision,
      (current) => ({ ...current, state: "repairing", repairAttempts: 1 }),
    )

    expect(repairing).toMatchObject({ state: "repairing", repairAttempts: 1 })
    await expect(store.update(
      "demo",
      input.fingerprint,
      created.diagnostic.revision,
      (current) => ({ ...current, state: "blocked" }),
    )).rejects.toThrow("Diagnostic changed")
  })

  it("allows only one consumer to claim a pending declared rerun", async () => {
    const { repository: store } = await repository()
    const created = await store.record(input)
    await store.update("demo", input.fingerprint, created.diagnostic.revision, (current) => ({
      ...current,
      state: "rerun_requested",
      repairAttempts: 1,
      rerunLease: "repair_11111111-1111-4111-8111-111111111111",
    }))

    const [first, second] = await Promise.all([store.claimNextRerun(), store.claimNextRerun()])

    expect([first, second].filter(Boolean)).toHaveLength(1)
    expect(first ?? second).toMatchObject({ state: "repairing", actionId: "test" })
  })
})
