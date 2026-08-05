import { describe, expect, it } from "vitest"
import type { BacklogItem } from "../../domain/schemas"
import type { DiscoveredProject } from "../../integration/filesystem/workspace-repository"
import { buildGitHubIssueDraft, buildGitHubPluginHandoff } from "./github-issue-draft"

const project = {
  id: "sample",
  displayName: "Sample",
  relativePath: "apps/sample",
} as DiscoveredProject

const task = {
  schemaVersion: 1,
  id: "tsk_11111111-1111-4111-8111-111111111111",
  projectId: "sample",
  title: "Harden tenant isolation",
  description: "Reject cross-tenant reads.",
  status: "ready",
  priority: "critical",
  workScope: { kind: "project" },
  tags: ["security", "Tenant"],
  acceptanceCriteria: [
    {
      id: "ac_22222222-2222-4222-8222-222222222222",
      text: "Cross-tenant fixture is rejected",
      completed: false,
    },
  ],
  dependencyIds: [],
  references: [{ kind: "repository_file", path: "apps/sample/src/auth.ts" }],
  createdAt: "2026-07-28T12:00:00.000Z",
  updatedAt: "2026-07-28T12:00:00.000Z",
  revision: "revision-123",
} satisfies BacklogItem

describe("GitHub issue draft", () => {
  it("creates a deterministic, traceable projection", () => {
    const draft = buildGitHubIssueDraft(project, task)
    expect(draft.title).toBe("[Sample] Harden tenant isolation")
    expect(draft.body).toContain("task=tsk_11111111-1111-4111-8111-111111111111")
    expect(draft.body).toContain("apps/sample/src/auth.ts")
    expect(draft.labels).toEqual([
      "matriz-workbench",
      "sample",
      "priority:critical",
      "security",
      "tenant",
    ])
    expect(draft.idempotencyKey).toContain(task.revision)
  })

  it("builds a plugin handoff that forbids duplicate issues", () => {
    const handoff = buildGitHubPluginHandoff(buildGitHubIssueDraft(project, task))
    expect(handoff).toContain("$github")
    expect(handoff).toContain("não duplique")
    expect(handoff).toContain("Peça aprovação")
  })
})
