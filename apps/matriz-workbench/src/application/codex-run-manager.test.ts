import { afterEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  CodexRunManager,
  assertExecutionCanStart,
  completeCodexRequestRecord,
  hasRequiredCheckEvidence,
  mutationApprovalRejection,
} from "./codex-run-manager"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

const originalLimit = process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS
const roots: string[] = []

afterEach(async () => {
  if (originalLimit === undefined) delete process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS
  else process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS = originalLimit
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "workbench-codex-policy-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sample"), { recursive: true })
  await writeFile(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  await writeFile(path.join(root, "apps", "sample", "package.json"), JSON.stringify({ name: "sample" }))
  const repository = await WorkspaceRepository.create(root)
  await repository.initializeProject("sample")
  return repository
}

describe("CodexRunManager concurrency", () => {
  it("requires a live structured claim before starting", () => {
    const legacy = {
      status: "queued",
      executionClaim: undefined,
    } as unknown as Parameters<typeof assertExecutionCanStart>[0]
    expect(() => assertExecutionCanStart(legacy)).toThrow("workflow de claim")

    const expired = {
      ...legacy,
      executionClaim: { lease: { expiresAt: "2026-08-04T15:00:00.000Z" } },
    } as unknown as Parameters<typeof assertExecutionCanStart>[0]
    expect(() => assertExecutionCanStart(expired, "2026-08-04T15:00:00.000Z"))
      .toThrow("expirou")
  })

  it("allows plan-only completion without inventing a check", () => {
    expect(hasRequiredCheckEvidence("plan_only", [])).toBe(true)
    expect(hasRequiredCheckEvidence("change", [])).toBe(false)
    expect(hasRequiredCheckEvidence(undefined, ["pnpm test"])).toBe(false)
  })

  it("fails closed for mutations without a change claim", () => {
    expect(mutationApprovalRejection(undefined)).toContain("não possui claim")
    expect(mutationApprovalRejection("plan_only")).toContain("plan-only")
    expect(mutationApprovalRejection("change")).toBeUndefined()
  })

  it("rejects a start before filesystem/runtime work when the local cap is full", async () => {
    process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS = "1"
    const manager = new CodexRunManager()
    const internal = manager as unknown as {
      sessions: Map<string, { connected: boolean }>
    }
    internal.sessions.set("sample:req_existing", { connected: true })

    await expect(manager.start(
      "sample",
      "req_11111111-1111-4111-8111-111111111111",
      "revision-1",
    )).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })

  it("completes the execution without moving the product state", async () => {
    const repository = await fixture()
    const item = await repository.createWorkItem("sample", {
      kind: "feature",
      title: "Board operacional",
      description: "",
      productStatus: "in_progress",
      validationStatus: "pending",
      humanReviewStatus: "pending",
      documentationStatus: "pending",
      priority: "high",
    })
    const queued = await repository.createAgentRequest("sample", item.id, "Implemente o corte.")
    const claimed = await repository.updateAgentRequest(
      "sample",
      queued.id,
      { status: "claimed", claimedBy: "codex" },
      queued.revision,
    )

    await completeCodexRequestRecord(repository, "sample", claimed.id, {
      resultSummary: "Execução concluída.",
      changedFiles: ["apps/sample/page.tsx"],
      checks: ["pnpm test"],
    })

    expect((await repository.getAgentRequest("sample", claimed.id)).status).toBe("completed")
    expect((await repository.getWorkItem("sample", item.id)).productStatus).toBe("in_progress")
  }, 15_000)
})
