import { appendFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import { RevisionConflictError } from "../../domain/errors"
import { WorkspaceRepository } from "./workspace-repository"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-workbench-"))
  roots.push(root)
  await writeFile(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n')
  await mkdir(path.join(root, "apps", "sample"), { recursive: true })
  await writeFile(
    path.join(root, "apps", "sample", "package.json"),
    JSON.stringify({ name: "@matriz/app-sample", description: "Sample project" }),
  )
  await writeFile(path.join(root, "apps", "sample", "README.md"), "# Sample\n")
  return { root, repository: await WorkspaceRepository.create(root) }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("WorkspaceRepository", () => {
  it("discovers package folders and ignores invalid folders", async () => {
    const { root, repository } = await fixture()
    await mkdir(path.join(root, "apps", "no-package"))
    const projects = await repository.discoverProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0]).toMatchObject({
      id: "sample",
      displayName: "Sample",
      initialized: false,
      relativePath: "apps/sample",
      hasReadme: true,
      hasAgentInstructions: false,
    })
  })

  it("discovers and initializes the repository root as an isolated project", async () => {
    const { root, repository } = await fixture()
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "matriz", description: "Repository control plane" }),
    )
    await writeFile(path.join(root, "README.md"), "# Matriz Infra Hub\n")

    const projects = await repository.discoverProjects()
    expect(projects.find((project) => project.id === "matriz-infra-hub")).toMatchObject({
      relativePath: ".",
      isRepositoryRoot: true,
      initialized: false,
    })

    await repository.initializeProject("matriz-infra-hub")
    await expect(
      readFile(path.join(root, ".matriz", "project.json"), "utf8"),
    ).resolves.toContain('"projectId": "matriz-infra-hub"')
    await expect(readdir(path.join(root, "apps", "sample"))).resolves.toEqual([
      "package.json",
      "README.md",
    ])
  })

  it("initializes only the selected .matriz workspace", async () => {
    const { root, repository } = await fixture()
    await repository.initializeProject("sample")
    const files = await readdir(path.join(root, "apps", "sample"))
    expect(files.sort()).toEqual([".matriz", "README.md", "package.json"])
    const matrixEntries = await readdir(path.join(root, "apps", "sample", ".matriz"))
    expect(matrixEntries.sort()).toEqual([
      "activity",
      "agents",
      "backlog",
      "context.json",
      "control",
      "docs",
      "project.json",
      "roadmap.json",
    ])
    await expect(
      readdir(path.join(root, "apps", "sample", ".matriz", "docs", "product")),
    ).resolves.toEqual([])
    expect(JSON.parse(await readFile(path.join(root, "apps", "sample", ".matriz", "project.json"), "utf8"))).toMatchObject({ projectId: "sample" })
  })

  it("rejects stale revisions", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const item = await repository.createBacklogItem("sample", {
      title: "First task",
      description: "",
      priority: "medium",
      tags: [],
    })
    await expect(
      repository.updateBacklogItem("sample", item.id, { status: "ready" }, "stale-revision"),
    ).rejects.toBeInstanceOf(RevisionConflictError)
  })

  it("reads V1 without rewriting it and creates V2 work items", async () => {
    const { root, repository } = await fixture()
    await repository.initializeProject("sample")
    const legacy = await repository.createBacklogItem("sample", {
      title: "Legacy task",
      description: "",
      priority: "medium",
      tags: [],
    })
    const legacyPath = path.join(root, "apps", "sample", ".matriz", "backlog", `${legacy.id}.json`)
    const before = await readFile(legacyPath, "utf8")
    const normalized = await repository.listWorkItems("sample")
    expect(normalized[0]).toMatchObject({ id: legacy.id, schemaVersion: 2, productStatus: "discovery" })
    expect(await readFile(legacyPath, "utf8")).toBe(before)

    const created = await repository.createWorkItem("sample", {
      kind: "feature",
      title: "Operational board",
      description: "",
      productStatus: "discovery",
      validationStatus: "pending",
      humanReviewStatus: "not_required",
      documentationStatus: "pending",
      priority: "high",
    })
    expect(created.id).toMatch(/^wi_/)
    expect((await WorkspaceRepository.create(root)).getWorkItem("sample", created.id)).resolves.toMatchObject({
      schemaVersion: 2,
      kind: "feature",
    })
  })

  it("serializes concurrent work item writes and reports the stale revision", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const item = await repository.createWorkItem("sample", {
      kind: "task",
      title: "Concurrent item",
      description: "",
      productStatus: "discovery",
      validationStatus: "not_required",
      humanReviewStatus: "not_required",
      documentationStatus: "not_required",
      priority: "medium",
    })
    const results = await Promise.allSettled([
      repository.updateWorkItem("sample", item.id, { title: "First writer" }, item.revision),
      repository.updateWorkItem("sample", item.id, { title: "Second writer" }, item.revision),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    })
  })

  it("serializes roadmap writes and persists temporal links to V2 work items", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const roadmap = await repository.getRoadmap("sample")
    const phases = [
      {
        id: "phase_00000000-0000-4000-8000-000000000000",
        title: "Planejamento",
        outcome: "Roadmap temporal operável.",
        status: "active" as const,
        initiatives: [
          {
            id: "ini_00000000-0000-4000-8000-000000000001",
            title: "Timeline trimestral",
            outcome: "Períodos e contexto visíveis.",
            status: "active" as const,
            startDate: "2026-08-01",
            targetDate: "2026-09-30",
            backlogIds: ["wi_00000000-0000-4000-8000-000000000002"],
          },
        ],
      },
    ]
    const saved = await repository.updateRoadmap("sample", phases, roadmap.revision)
    expect(saved.phases[0].initiatives[0]).toMatchObject({
      startDate: "2026-08-01",
      targetDate: "2026-09-30",
      backlogIds: ["wi_00000000-0000-4000-8000-000000000002"],
    })

    const results = await Promise.allSettled([
      repository.updateRoadmap("sample", [{ ...phases[0], title: "Primeiro escritor" }], saved.revision),
      repository.updateRoadmap("sample", [{ ...phases[0], title: "Segundo escritor" }], saved.revision),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    })
  })

  it("allows human-only completion with evidence and keeps governance explicit", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const item = await repository.createWorkItem("sample", {
      kind: "task",
      title: "Human-only task",
      description: "",
      productStatus: "validation",
      validationStatus: "not_required",
      humanReviewStatus: "not_required",
      documentationStatus: "not_required",
      priority: "medium",
      acceptanceCriteria: ["Resultado revisado"],
    })
    const prepared = await repository.updateWorkItem("sample", item.id, {
      acceptanceCriteria: item.acceptanceCriteria.map((criterion) => ({ ...criterion, completed: true })),
      references: [{ kind: "external_url", url: "https://example.com/evidence" }],
    }, item.revision)
    const completed = await repository.updateWorkItem(
      "sample",
      item.id,
      { productStatus: "completed" },
      prepared.revision,
    )
    expect(completed.productStatus).toBe("completed")
  })

  it("filters work item history by entity id", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const first = await repository.createWorkItem("sample", {
      kind: "task", title: "First", description: "", productStatus: "discovery",
      validationStatus: "not_required", humanReviewStatus: "not_required",
      documentationStatus: "not_required", priority: "low",
    })
    await repository.createWorkItem("sample", {
      kind: "task", title: "Second", description: "", productStatus: "discovery",
      validationStatus: "not_required", humanReviewStatus: "not_required",
      documentationStatus: "not_required", priority: "low",
    })
    const events = await repository.queryActivity("sample", { entityId: first.id })
    expect(events).toHaveLength(1)
    expect(events[0].entityId).toBe(first.id)
  })

  it("persists control evidence atomically and rejects stale review", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const evidence = await repository.createControlEvidence("sample", {
      scorecardSlug: "app",
      goalId: "goal_00000000-0000-0000-0000-000000000000",
      claim: "Typecheck passou",
      references: ["apps/sample/package.json"],
      source: "codex",
    })
    expect(evidence.status).toBe("proposed")
    await expect(repository.reviewControlEvidence("sample", evidence.id, "approved", "stale-revision")).rejects.toBeInstanceOf(RevisionConflictError)
    const approved = await repository.reviewControlEvidence("sample", evidence.id, "approved", evidence.revision)
    expect(approved.status).toBe("approved")
    expect((await repository.listControlApprovals("sample"))).toHaveLength(1)
    expect((await repository.listSnippets("sample")).map((item) => item.command)).toEqual([
      "/contexto-curto", "/criterios", "/verificacao", "/handoff",
    ])
  })

  it("keeps activity append-only", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    await repository.appendActivity("sample", {
      actor: "agent",
      action: "verification.completed",
      summary: "Checks executados em C:\\Users\\alice\\repo.",
      entityType: "project",
      entityId: "sample",
    })
    const events = await repository.listActivity("sample")
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.actor)).toContain("agent")
  })

  it("queries audit events and skips malformed JSONL lines", async () => {
    const { root, repository } = await fixture()
    await repository.initializeProject("sample")
    await repository.appendActivity("sample", {
      actor: "agent",
      action: "verification.completed",
      summary: "Checks executados em C:\\Users\\alice\\repo.",
      entityType: "project",
      entityId: "sample",
    })
    const month = new Date().toISOString().slice(0, 7)
    await appendFile(
      path.join(root, "apps", "sample", ".matriz", "activity", `${month}.jsonl`),
      "{linha-invalida}\n",
    )

    const events = await repository.queryActivity("sample", {
      actor: "agent",
      text: "checks",
      limit: 10,
    })
    const retention = await repository.getActivityRetentionReport("sample")

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ action: "verification.completed", actor: "agent" })
    expect(events[0].summary).toContain("%USERPROFILE%")
    expect(events[0].summary).not.toContain("alice")
    expect(retention).toMatchObject({
      months: 1,
      oldestMonth: month,
      newestMonth: month,
      oversizedMonths: [],
    })
    expect(retention.totalBytes).toBeGreaterThan(0)
  })

  it("enforces the agent request lifecycle and completion evidence", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const task = await repository.createBacklogItem("sample", {
      title: "Prove the coworking flow",
      description: "Create, claim and complete a request with evidence.",
      priority: "high",
      tags: ["coworking"],
      acceptanceCriteria: ["The request has execution evidence"],
    })
    const request = await repository.createAgentRequest(
      "sample",
      task.id,
      "Use the linked task as the source of truth.",
    )

    await expect(
      repository.updateAgentRequest(
        "sample",
        request.id,
        {
          status: "completed",
          resultSummary: "Finished without claiming the request.",
          changedFiles: ["apps/sample/package.json"],
          checks: ["pnpm test"],
        },
        request.revision,
      ),
    ).rejects.toMatchObject({ code: "INVALID_DATA" })

    const claimed = await repository.updateAgentRequest(
      "sample",
      request.id,
      { status: "claimed", claimedBy: "codex" },
      request.revision,
    )

    await expect(
      repository.updateAgentRequest(
        "sample",
        request.id,
        {
          status: "completed",
          resultSummary: "Finished without verification.",
          changedFiles: ["apps/sample/package.json"],
          checks: [],
        },
        claimed.revision,
      ),
    ).rejects.toMatchObject({ code: "INVALID_DATA" })

    const completed = await repository.updateAgentRequest(
      "sample",
      request.id,
      {
        status: "completed",
        resultSummary: "The proof is implemented and verified.",
        changedFiles: ["apps/sample/package.json"],
        checks: ["pnpm test"],
      },
      claimed.revision,
    )

    expect(completed.status).toBe("completed")
    expect(completed.claimedBy).toBe("codex")
    expect(completed.resultSummary).toContain("implemented")
    expect(completed.checks).toEqual(["pnpm test"])

    await expect(
      repository.updateBacklogItem(
        "sample",
        task.id,
        { status: "done" },
        task.revision,
      ),
    ).rejects.toMatchObject({ code: "INVALID_DATA" })

    const accepted = await repository.updateBacklogItem(
      "sample",
      task.id,
      {
        acceptanceCriteria: task.acceptanceCriteria.map((criterion) => ({
          ...criterion,
          completed: true,
        })),
      },
      task.revision,
    )
    const done = await repository.updateBacklogItem(
      "sample",
      task.id,
      { status: "done" },
      accepted.revision,
    )
    expect(done.status).toBe("done")
  })

  it("rejects completion evidence that points outside the repository", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const task = await repository.createBacklogItem("sample", {
      title: "Unsafe evidence",
      description: "",
      priority: "medium",
      tags: [],
    })
    const request = await repository.createAgentRequest("sample", task.id, "Reference a file.")
    const claimed = await repository.updateAgentRequest(
      "sample",
      request.id,
      { status: "claimed", claimedBy: "codex" },
      request.revision,
    )

    await expect(
      repository.updateAgentRequest(
        "sample",
        request.id,
        {
          status: "completed",
          resultSummary: "This evidence must not be accepted.",
          changedFiles: ["C:\\secrets\\token.txt"],
          checks: ["pnpm test"],
        },
        claimed.revision,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PATH" })
  })

  it("rejects repository references to environment and generated files", async () => {
    const { root, repository } = await fixture()
    await writeFile(path.join(root, ".env"), "SECRET=value\n")
    await mkdir(path.join(root, "node_modules"), { recursive: true })
    await writeFile(path.join(root, "node_modules", "generated.md"), "# Generated\n")
    await repository.initializeProject("sample")
    const item = await repository.createBacklogItem("sample", {
      title: "Unsafe references",
      description: "",
      priority: "high",
      tags: [],
    })

    for (const unsafePath of [".env", "node_modules/generated.md"]) {
      await expect(
        repository.updateBacklogItem(
          "sample",
          item.id,
          {
            references: [
              {
                kind: "repository_file",
                path: unsafePath,
              },
            ],
          },
          item.revision,
        ),
      ).rejects.toMatchObject({ code: "INVALID_PATH" })
    }
  })
})
