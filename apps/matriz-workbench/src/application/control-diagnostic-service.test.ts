import { mkdtemp, mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ControlDiagnosticRepository } from "../integration/filesystem/control-diagnostic-repository"
import {
  AutomatedRepairCoordinator,
  ControlDiagnosticService,
  markAutomatedRepairFailed,
  requestAutomatedRepairRerun,
} from "./control-diagnostic-service"

const roots: string[] = []
const input = {
  projectId: "demo",
  actionId: "test" as const,
  sessionId: "term_123",
  status: "failed" as const,
  exitCode: 1,
  lines: ["FAIL runtime"],
  occurredAt: "2026-08-25T18:00:00.000Z",
  fingerprint: "b".repeat(64),
}

async function service(startRepair: (projectId: string, fingerprint: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "matriz-diagnostic-service-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "demo", ".matriz"), { recursive: true })
  return new ControlDiagnosticService(new ControlDiagnosticRepository(root), startRepair)
}

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe("ControlDiagnosticService", () => {
  it("starts automatic repair only for a newly created diagnostic", async () => {
    const starts: string[] = []
    const diagnostics = await service(async (projectId, fingerprint) => { starts.push(`${projectId}:${fingerprint}`) })

    const first = await diagnostics.ingest(input)
    const duplicate = await diagnostics.ingest({ ...input, sessionId: "term_456" })

    expect(first.created).toBe(true)
    expect(duplicate.created).toBe(false)
    expect(starts).toEqual([`demo:${input.fingerprint}`])
  })

  it("persists the diagnostic even when automatic repair cannot start", async () => {
    const diagnostics = await service(async () => { throw new Error("Codex unavailable") })

    await expect(diagnostics.ingest(input)).resolves.toMatchObject({ created: true, repairScheduled: false })
  })

  it("creates and claims one bounded request before starting Codex", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "matriz-diagnostic-orchestrator-"))
    roots.push(root)
    await mkdir(path.join(root, "apps", "demo", ".matriz"), { recursive: true })
    const repository = new ControlDiagnosticRepository(root)
    await repository.record(input)
    const calls: string[] = []
    const coordinator = new AutomatedRepairCoordinator(
      repository,
      {
        createBacklogItem: async (_projectId, item) => {
          calls.push(`backlog:${item.title}`)
          return { id: "tsk_11111111-1111-4111-8111-111111111111" }
        },
        createAgentRequest: async (_projectId, _itemId, instructions) => {
          calls.push(`request:${instructions.includes(`diag_${input.fingerprint}`)}`)
          return { id: "req_11111111-1111-4111-8111-111111111111", revision: "queued-revision" }
        },
        claimAgentRequest: async (_projectId, _requestId, claim, revision) => {
          calls.push(`claim:${claim.executionMode}:${claim.plannedChecks[0]}:${revision}`)
          return { id: "req_11111111-1111-4111-8111-111111111111", revision: "claimed-revision" }
        },
      },
      { observeCurrent: async () => ({ headCommit: "a".repeat(40), dirtyPaths: [] }) },
      {
        startAutomatedRepair: async (_projectId, _requestId, revision, diagnosticId) => {
          calls.push(`codex:${revision}:${diagnosticId}`)
          return { revision: "run-revision" }
        },
      },
      () => "2026-08-25T18:00:00.000Z",
    )

    const started = await coordinator.start("demo", input.fingerprint)

    expect(started).toMatchObject({ state: "repairing", repairAttempts: 1, codexRunRevision: "run-revision" })
    expect(calls).toEqual([
      "backlog:Corrigir falha de test em demo",
      "request:true",
      "claim:change:corepack pnpm --filter ./apps/demo test:queued-revision",
      `codex:claimed-revision:diag_${input.fingerprint}`,
    ])
  })

  it("persists cooldown when Codex is unavailable after reserving an attempt", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "matriz-diagnostic-cooldown-"))
    roots.push(root)
    await mkdir(path.join(root, "apps", "demo", ".matriz"), { recursive: true })
    const repository = new ControlDiagnosticRepository(root)
    await repository.record(input)
    const coordinator = new AutomatedRepairCoordinator(
      repository,
      {
        createBacklogItem: async () => ({ id: "tsk_11111111-1111-4111-8111-111111111111" }),
        createAgentRequest: async () => ({ id: "req_11111111-1111-4111-8111-111111111111", revision: "queued" }),
        claimAgentRequest: async () => ({ id: "req_11111111-1111-4111-8111-111111111111", revision: "claimed" }),
      },
      { observeCurrent: async () => ({ headCommit: "a".repeat(40), dirtyPaths: [] }) },
      { startAutomatedRepair: async () => { throw new Error("Codex unavailable") } },
      () => "2026-08-25T18:00:00.000Z",
    )

    await expect(coordinator.start("demo", input.fingerprint)).rejects.toThrow("Codex unavailable")
    await expect(repository.get("demo", input.fingerprint)).resolves.toMatchObject({
      state: "cooling_down",
      repairAttempts: 1,
      cooldownUntil: "2026-08-25T18:00:30.000Z",
    })
  })

  it("moves a completed automated turn to the declared rerun queue", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "matriz-diagnostic-rerun-"))
    roots.push(root)
    await mkdir(path.join(root, "apps", "demo", ".matriz"), { recursive: true })
    const repository = new ControlDiagnosticRepository(root)
    const created = await repository.record(input)
    await repository.update("demo", input.fingerprint, created.diagnostic.revision, (current) => ({
      ...current,
      state: "repairing",
      repairAttempts: 1,
    }))

    await requestAutomatedRepairRerun(repository, "demo", `diag_${input.fingerprint}`, () => "lease-1")

    await expect(repository.get("demo", input.fingerprint)).resolves.toMatchObject({
      state: "rerun_requested",
      rerunLease: "lease-1",
    })
  })

  it("blocks an automated diagnostic after its third failed turn", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "matriz-diagnostic-blocked-"))
    roots.push(root)
    await mkdir(path.join(root, "apps", "demo", ".matriz"), { recursive: true })
    const repository = new ControlDiagnosticRepository(root)
    const created = await repository.record(input)
    await repository.update("demo", input.fingerprint, created.diagnostic.revision, (current) => ({
      ...current,
      state: "repairing",
      repairAttempts: 3,
    }))

    await markAutomatedRepairFailed(
      repository,
      "demo",
      `diag_${input.fingerprint}`,
      "2026-08-25T18:00:00.000Z",
    )

    await expect(repository.get("demo", input.fingerprint)).resolves.toMatchObject({ state: "blocked" })
  })
})
