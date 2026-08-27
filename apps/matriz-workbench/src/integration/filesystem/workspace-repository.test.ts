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
  it("initializes atomic team records without overwriting edited Nilo or Zara profiles", async () => {
    const { root, repository } = await fixture()
    await repository.initializeProject("sample")

    const profiles = await repository.listAgentProfiles("sample")
    expect(profiles.map((profile) => profile.id).sort()).toEqual(["nilo-builder", "zara-link"])

    const niloPath = path.join(root, "apps", "sample", ".matriz", "agents", "profiles", "nilo-builder.json")
    const edited = { ...profiles.find((profile) => profile.id === "nilo-builder")!, displayName: "Nilo customizado" }
    await writeFile(niloPath, `${JSON.stringify(edited, null, 2)}\n`)

    await repository.initializeAgentTeam("sample")

    await expect(readFile(niloPath, "utf8")).resolves.toContain("Nilo customizado")
    await expect(readFile(path.join(root, "apps", "sample", ".matriz", "agents", "profiles", "zara-link.json"), "utf8"))
      .resolves.toContain("Zara Link")
  })

  it("persists a mission and its evidence in separate atomic agent records", async () => {
    const { root, repository } = await fixture()
    await repository.initializeProject("sample")
    const [profile] = await repository.listAgentProfiles("sample")
    const mission = await repository.createAgentMission("sample", {
      schemaVersion: 1,
      id: "mission_00000000-0000-4000-8000-000000000001",
      profileId: profile.id,
      projectId: "sample",
      title: "Persist team records",
      objective: "Store mission evidence as reviewable JSON.",
      allowedPaths: ["src"],
      authority: "change_scoped",
      status: "assigned",
      contextReferences: [],
      acceptanceCriteria: [],
      evidenceIds: [],
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-27T12:00:00.000Z",
      revision: "mission-revision",
    })
    const nextMission = { ...mission, evidenceIds: ["evidence_00000000-0000-4000-8000-000000000002"], updatedAt: "2026-08-27T12:01:00.000Z", revision: "next-mission-revision" }
    const evidence = {
      schemaVersion: 1 as const,
      id: "evidence_00000000-0000-4000-8000-000000000002",
      missionId: mission.id,
      kind: "test" as const,
      summary: "Focused repository test passed.",
      recordedBy: "nilo-builder",
      command: "pnpm --filter @matriz/app-matriz-workbench test",
      recordedAt: "2026-08-27T12:01:00.000Z",
    }

    await repository.recordAgentMissionEvidence("sample", evidence, nextMission, mission.revision)

    await expect(repository.getAgentMission("sample", mission.id)).resolves.toEqual(nextMission)
    await expect(repository.listAgentMissionEvidence("sample", mission.id)).resolves.toEqual([evidence])
    await expect(repository.updateAgentMission("sample", nextMission, "stale-revision"))
      .rejects.toBeInstanceOf(RevisionConflictError)
    await expect(readFile(path.join(root, "apps", "sample", ".matriz", "agents", "missions", `${mission.id}.json`), "utf8"))
      .resolves.toContain("next-mission-revision")
  })

  it("recovers an evidence write when the mission update fails after the append", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const profile = (await repository.listAgentProfiles("sample"))[0]!
    const mission = await repository.createAgentMission("sample", {
      schemaVersion: 1,
      id: "mission_00000000-0000-4000-8000-000000000006",
      profileId: profile.id,
      projectId: "sample",
      title: "Recover evidence persistence",
      objective: "Make the aggregate write retry-safe.",
      allowedPaths: ["src"], authority: "change_scoped", status: "assigned",
      contextReferences: [], acceptanceCriteria: [], evidenceIds: [],
      createdAt: "2026-08-27T12:00:00.000Z", updatedAt: "2026-08-27T12:00:00.000Z",
      revision: "mission-revision",
    })
    const evidence = {
      schemaVersion: 1 as const,
      id: "evidence_00000000-0000-4000-8000-000000000007",
      missionId: mission.id,
      kind: "note" as const,
      summary: "Retry-safe aggregate evidence.",
      recordedBy: "nilo-builder",
      note: "The evidence is durable before the mission reference is committed.",
      recordedAt: "2026-08-27T12:01:00.000Z",
    }
    const nextMission = { ...mission, evidenceIds: [evidence.id], updatedAt: evidence.recordedAt, revision: "next-mission-revision" }
    type AtomicWrite = (projectId: string, segments: string[], value: unknown) => Promise<void>
    const originalAtomicWrite = (repository as unknown as { atomicWrite: AtomicWrite }).atomicWrite
    let failMissionOnce = true
    ;(repository as unknown as { atomicWrite: (...args: unknown[]) => Promise<void> }).atomicWrite = async (...args) => {
      const segments = args[1] as string[]
      if (failMissionOnce && segments[1] === "missions") {
        failMissionOnce = false
        throw new Error("simulated mission write failure")
      }
      return originalAtomicWrite.call(repository, args[0] as string, segments, args[2])
    }

    await expect(repository.recordAgentMissionEvidence("sample", evidence, nextMission, mission.revision))
      .rejects.toThrow("simulated mission write failure")
    await expect(repository.listAgentMissionEvidence("sample", mission.id)).resolves.toEqual([evidence])
    await expect(repository.recordAgentMissionEvidence("sample", evidence, nextMission, mission.revision))
      .resolves.toEqual({ mission: nextMission, evidence })
  })

  it("does not take over an expired coordinator lease while its process remains alive", async () => {
    const { root, repository } = await fixture()
    await mkdir(path.join(root, ".runtime", "workbench", "locks"), { recursive: true })
    const lockPath = path.join(root, ".runtime", "workbench", "locks", "coordinator--agent-team.lock")
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, expiresAt: Date.now() - 1 }))

    await expect((repository as unknown as {
      withCoordinatorLock: (key: string, operation: () => Promise<string>, maxAttempts: number) => Promise<string>
    }).withCoordinatorLock("agent-team", async () => "taken-over", 2))
      .rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("appends validated handoffs without replacing an earlier mission context", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const profile = (await repository.listAgentProfiles("sample"))[0]!
    const mission = await repository.createAgentMission("sample", {
      schemaVersion: 1,
      id: "mission_00000000-0000-4000-8000-000000000003",
      profileId: profile.id,
      projectId: "sample",
      title: "Preserve a team handoff",
      objective: "Store a compact, human-authored continuation point.",
      allowedPaths: ["src"],
      authority: "propose",
      status: "assigned",
      contextReferences: [],
      acceptanceCriteria: [],
      evidenceIds: [],
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-27T12:00:00.000Z",
      revision: "mission-revision",
    })
    const handoff = {
      schemaVersion: 1 as const,
      id: "handoff_00000000-0000-4000-8000-000000000004",
      missionId: mission.id,
      contextSummary: "Repository records have been initialized.",
      decisions: ["Human review remains required."],
      risks: ["No execution runtime exists in phase one."],
      nextStep: "Review the persisted mission.",
      authoredBy: { kind: "human" as const, id: "human_00000000-0000-4000-8000-000000000005" },
      createdAt: "2026-08-27T12:01:00.000Z",
    }

    await repository.createAgentMissionHandoff("sample", handoff, mission.revision)

    await expect(repository.listAgentMissionHandoffs("sample", mission.id)).resolves.toEqual([handoff])
    await expect(repository.getAgentMission("sample", mission.id)).resolves.toEqual(mission)
  })

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

  it("treats a missing agent requests subdirectory as an empty collection", async () => {
    const { root, repository } = await fixture()
    await repository.initializeProject("sample")
    const agents = path.join(root, "apps", "sample", ".matriz", "agents")
    await rm(path.join(agents, "requests"), { recursive: true, force: true })

    await expect(readdir(agents)).resolves.not.toContain("requests")
    await expect(repository.listAgentRequests("sample")).resolves.toEqual([])
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

  it("accepts an Inbox entry idempotently and preserves its origin", async () => {
    const { root, repository } = await fixture()
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "matriz" }))
    await writeFile(path.join(root, "README.md"), "# Matriz Infra Hub\n")
    await repository.initializeProject("matriz-infra-hub")
    await repository.initializeProject("sample")
    const inbox = await repository.createInboxItem({
      title: "Criar captura progressiva",
      detail: "Começar com uma frase.",
      origin: "human",
      suggestedProjectId: "sample",
      suggestedKind: "feature",
    })
    const first = await repository.acceptInboxItem(inbox.id, { projectId: "sample", kind: "feature" }, inbox.revision)
    const second = await repository.acceptInboxItem(inbox.id, { projectId: "sample", kind: "feature" }, inbox.revision)
    expect(second.workItem.id).toBe(first.workItem.id)
    expect(first.workItem.originRef).toEqual({ kind: "inbox", id: inbox.id })
    expect(await repository.listWorkItems("sample")).toHaveLength(1)
  })

  it("enforces parent semantics, archival reasons and a single active sprint", async () => {
    const { root, repository } = await fixture()
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "matriz" }))
    await writeFile(path.join(root, "README.md"), "# Matriz Infra Hub\n")
    await repository.initializeProject("matriz-infra-hub")
    await repository.initializeProject("sample")
    const outcome = await repository.createWorkItem("sample", {
      kind: "outcome", title: "Operação contínua validada", description: "", productStatus: "discovery",
      validationStatus: "pending", humanReviewStatus: "not_required", documentationStatus: "pending", priority: "high",
    })
    const deliverable = await repository.createWorkItem("sample", {
      kind: "feature", title: "Inbox operacional", description: "", productStatus: "discovery",
      validationStatus: "pending", humanReviewStatus: "not_required", documentationStatus: "not_required", priority: "high",
      parentId: outcome.id,
    })
    expect(deliverable.parentId).toBe(outcome.id)
    await expect(repository.updateWorkItem("sample", deliverable.id, { productStatus: "archived" }, deliverable.revision)).rejects.toMatchObject({ code: "INVALID_DATA" })

    const sprint = await repository.createSprint({
      name: "Sprint adaptativa 1", intent: "Provar Inbox até validação.", startDate: "2026-08-03", endDate: "2026-08-14", status: "active",
      outcomes: [{ id: "commit_00000000-0000-4000-8000-000000000001", ref: { kind: "work_item_outcome", projectId: "sample", workItemId: outcome.id }, title: outcome.title, resultSummary: "", evidenceRefs: [] }],
      work: [{ projectId: "sample", workItemId: deliverable.id, outcomeCommitmentId: "commit_00000000-0000-4000-8000-000000000001", executionMode: "paired", addedAt: "2026-08-03T12:00:00.000Z" }],
    })
    expect(sprint.status).toBe("active")
    await expect(repository.createSprint({
      name: "Sprint concorrente", intent: "Não deve ativar.", startDate: "2026-08-03", endDate: "2026-08-14", status: "active",
    })).rejects.toMatchObject({ code: "INVALID_DATA" })
  })

  it("blocks new active work when the sprint WIP limit is reached", async () => {
    const { root, repository } = await fixture()
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "matriz" }))
    await writeFile(path.join(root, "README.md"), "# Matriz Infra Hub\n")
    await repository.initializeProject("matriz-infra-hub")
    await repository.initializeProject("sample")
    const outcome = await repository.createWorkItem("sample", {
      kind: "outcome", title: "Fluxo validado", description: "", productStatus: "discovery",
      validationStatus: "pending", humanReviewStatus: "not_required", documentationStatus: "pending", priority: "high",
    })
    const active = await repository.createWorkItem("sample", {
      kind: "task", title: "Trabalho ativo", description: "", productStatus: "in_progress",
      validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required", priority: "medium", parentId: outcome.id,
    })
    const waiting = await repository.createWorkItem("sample", {
      kind: "task", title: "Trabalho aguardando", description: "", productStatus: "ready",
      validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required", priority: "medium", parentId: outcome.id,
    })
    const commitmentId = "commit_00000000-0000-4000-8000-000000000099"
    await repository.createSprint({
      name: "Sprint WIP", intent: "Manter foco explícito.", startDate: "2026-08-03", endDate: "2026-08-14", status: "active", wipLimit: 1,
      outcomes: [{ id: commitmentId, ref: { kind: "work_item_outcome", projectId: "sample", workItemId: outcome.id }, title: outcome.title, resultSummary: "", evidenceRefs: [] }],
      work: [active, waiting].map((item) => ({ projectId: "sample", workItemId: item.id, outcomeCommitmentId: commitmentId, executionMode: "human" as const, addedAt: "2026-08-03T12:00:00.000Z" })),
    })
    await expect(repository.updateWorkItem("sample", waiting.id, { productStatus: "in_progress" }, waiting.revision)).rejects.toMatchObject({ code: "INVALID_DATA" })
  })

  it("accepts only cross-project dependencies between sprint work references", async () => {
    const { root, repository } = await fixture()
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "matriz" }))
    await writeFile(path.join(root, "README.md"), "# Matriz Infra Hub\n")
    await mkdir(path.join(root, "apps", "another"), { recursive: true })
    await writeFile(path.join(root, "apps", "another", "package.json"), JSON.stringify({ name: "@matriz/app-another" }))
    await repository.initializeProject("matriz-infra-hub")
    await repository.initializeProject("sample")
    await repository.initializeProject("another")
    const outcome = await repository.createWorkItem("sample", {
      kind: "outcome", title: "Integração validada", description: "", productStatus: "discovery",
      validationStatus: "pending", humanReviewStatus: "not_required", documentationStatus: "pending", priority: "high",
    })
    const source = await repository.createWorkItem("sample", {
      kind: "task", title: "Publicar contrato", description: "", productStatus: "ready",
      validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required", priority: "medium", parentId: outcome.id,
    })
    const target = await repository.createWorkItem("another", {
      kind: "task", title: "Consumir contrato", description: "", productStatus: "ready",
      validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required", priority: "medium",
    })
    const commitmentId = "commit_00000000-0000-4000-8000-000000000123"
    const sprint = await repository.createSprint({
      name: "Sprint transversal", intent: "Validar dependências explícitas.", startDate: "2026-08-03", endDate: "2026-08-14",
      outcomes: [{ id: commitmentId, ref: { kind: "work_item_outcome", projectId: "sample", workItemId: outcome.id }, title: outcome.title, resultSummary: "", evidenceRefs: [] }],
      work: [source, target].map((item, index) => ({ projectId: index === 0 ? "sample" : "another", workItemId: item.id, outcomeCommitmentId: commitmentId, executionMode: "human" as const, addedAt: "2026-08-03T12:00:00.000Z" })),
    })
    const dependency = { fromProjectId: "sample", fromWorkItemId: source.id, toProjectId: "another", toWorkItemId: target.id, summary: "Contrato precisa estar publicado antes do consumo." }
    await expect(repository.updateSprint(sprint.id, { crossProjectDependencies: [dependency] }, sprint.revision)).resolves.toMatchObject({ crossProjectDependencies: [dependency] })
    const updated = await repository.getSprint(sprint.id)
    await expect(repository.updateSprint(updated.id, { work: updated.work.slice(0, 1), crossProjectDependencies: [dependency] }, updated.revision)).rejects.toMatchObject({ code: "INVALID_DATA" })
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

  it("claims a bounded scope atomically and rejects overlapping live ownership", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const task = await repository.createWorkItem("sample", {
      kind: "task",
      title: "Coordinate two agents",
      description: "",
      productStatus: "ready",
      validationStatus: "pending",
      humanReviewStatus: "pending",
      documentationStatus: "pending",
      priority: "high",
    })
    const first = await repository.createAgentRequest("sample", task.id, "First agent")
    const second = await repository.createAgentRequest("sample", task.id, "Second agent")
    const claimInput = {
      claimedBy: "codex:thread-a",
      executionMode: "change" as const,
      intendedFiles: ["apps/sample/src/domain"],
      intendedSurfaces: ["sample-domain"],
      plannedChecks: ["pnpm --filter sample test"],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T15:00:00.000Z",
      expiresAt: "2026-08-04T15:30:00.000Z",
    }

    const claimed = await repository.claimAgentRequest(
      "sample",
      first.id,
      claimInput,
      first.revision,
      "2026-08-04T15:05:00.000Z",
    )
    expect(claimed.executionClaim?.intendedFiles).toEqual(["apps/sample/src/domain"])

    await expect(repository.claimAgentRequest(
      "sample",
      first.id,
      { ...claimInput, claimedBy: "codex:thread-b" },
      claimed.revision,
      "2026-08-04T15:05:00.000Z",
    )).rejects.toMatchObject({ code: "CONFLICT" })

    const renewed = await repository.renewAgentRequestClaim(
      "sample",
      first.id,
      claimed.revision,
      1,
      "2026-08-04T15:10:00.000Z",
      "2026-08-04T15:40:00.000Z",
      "Concluído o contrato de domínio.",
    )
    expect(renewed.executionClaim?.lease.generation).toBe(2)

    await expect(repository.claimAgentRequest(
      "sample",
      second.id,
      {
        ...claimInput,
        claimedBy: "codex:thread-b",
        intendedFiles: ["apps/sample/src/domain/models.ts"],
      },
      second.revision,
      "2026-08-04T15:05:00.000Z",
    )).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("completes a claimed plan-only request without fake checks", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const task = await repository.createWorkItem("sample", {
      kind: "task",
      title: "Plan the protocol",
      description: "",
      productStatus: "ready",
      validationStatus: "pending",
      humanReviewStatus: "pending",
      documentationStatus: "pending",
      priority: "high",
    })
    const queued = await repository.createAgentRequest("sample", task.id, "Plan only")
    const claimed = await repository.claimAgentRequest("sample", queued.id, {
      claimedBy: "codex:planner",
      executionMode: "plan_only",
      intendedFiles: [],
      intendedSurfaces: ["engineering-operations"],
      plannedChecks: [],
      baseCommit: "a".repeat(40),
      dirtyPaths: ["AGENTS.md"],
      acquiredAt: "2026-08-04T15:00:00.000Z",
      expiresAt: "2026-08-04T15:30:00.000Z",
    }, queued.revision, "2026-08-04T15:05:00.000Z")

    const completed = await repository.updateAgentRequest("sample", queued.id, {
      status: "completed",
      resultSummary: "Plano entregue para revisão humana.",
      changedFiles: [],
      checks: [],
    }, claimed.revision, "codex")

    expect(completed.status).toBe("completed")
    expect(completed.checks).toEqual([])
  })

  it("persists reconciliation snapshots with optimistic revision", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const snapshot = await repository.writeReconciliationSnapshot("sample", {
      status: "divergent",
      projectId: "sample",
      requestId: "req_00000000-0000-4000-8000-000000000001",
      requestRevision: "request-revision",
      runRevision: "run-revision",
      observedAt: "2026-08-04T15:20:00.000Z",
      threadObservation: "unavailable",
      findings: [{
        code: "review_stale",
        severity: "error",
        summary: "A revisão está stale.",
      }],
    })

    await expect(repository.getReconciliationSnapshot("sample", snapshot.requestId))
      .resolves.toEqual(snapshot)
    await expect(repository.writeReconciliationSnapshot("sample", {
      ...snapshot,
      observedAt: "2026-08-04T15:21:00.000Z",
    }, "stale-revision")).rejects.toBeInstanceOf(RevisionConflictError)
  })

  it("reviews a completed execution without moving the product and rejects stale review writes", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const task = await repository.createWorkItem("sample", {
      kind: "feature",
      title: "Review execution independently",
      description: "",
      productStatus: "validation",
      validationStatus: "pending",
      humanReviewStatus: "pending",
      documentationStatus: "current",
      priority: "high",
    })
    const queued = await repository.createAgentRequest("sample", task.id, "Implement and verify.")
    const claimed = await repository.updateAgentRequest(
      "sample",
      queued.id,
      { status: "claimed", claimedBy: "codex" },
      queued.revision,
    )
    const completed = await repository.updateAgentRequest(
      "sample",
      queued.id,
      {
        status: "completed",
        resultSummary: "Implementation verified.",
        changedFiles: ["apps/sample/package.json"],
        checks: ["pnpm test"],
      },
      claimed.revision,
    )

    await expect(repository.reviewAgentRequest(
      "sample",
      completed.id,
      { status: "approved", reviewedBy: "Agent" },
      completed.revision,
      "codex",
    )).rejects.toMatchObject({ code: "INVALID_DATA" })

    const results = await Promise.allSettled([
      repository.reviewAgentRequest("sample", completed.id, {
        status: "approved",
        reviewedBy: "Zara",
        note: "Diff e checks revisados.",
        runRevision: "run-revision-1",
      }, completed.revision),
      repository.reviewAgentRequest("sample", completed.id, {
        status: "changes_requested",
        reviewedBy: "Zara",
        note: "Revisar a documentação.",
        runRevision: "run-revision-1",
      }, completed.revision),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect((await repository.getWorkItem("sample", task.id)).productStatus).toBe("validation")
    expect((await repository.getAgentRequest("sample", completed.id)).status).toBe("completed")
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

  it("serializes marker updates and filters marker history", async () => {
    const { repository } = await fixture()
    await repository.initializeProject("sample")
    const roadmap = await repository.getRoadmap("sample")
    const phase = { id: "phase_11111111-1111-4111-8111-111111111111", title: "Entrega", outcome: "", status: "active" as const, initiatives: [] }
    const withPhase = await repository.updateRoadmap("sample", [phase], roadmap.revision)
    const marker = {
      id: "marker_22222222-2222-4222-8222-222222222222", phaseId: phase.id, kind: "milestone" as const, status: "planned" as const,
      title: "M1", description: "", targetDate: "2026-08-20", backlogIds: [], references: [],
    }
    const saved = await repository.updateRoadmapMarkers("sample", [marker], withPhase.revision, "human", { action: "roadmap.marker_created", summary: "Marco criado", entityId: marker.id })
    const results = await Promise.allSettled([
      repository.updateRoadmapMarkers("sample", [{ ...marker, title: "Primeiro" }], saved.revision),
      repository.updateRoadmapMarkers("sample", [{ ...marker, title: "Segundo" }], saved.revision),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect(await repository.queryActivity("sample", { entityId: marker.id, limit: 20 })).toEqual(expect.arrayContaining([expect.objectContaining({ action: "roadmap.marker_created" })]))
  })
})
