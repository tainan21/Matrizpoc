import { describe, expect, it } from "vitest"
import { buildScoreSummary, DEFAULT_SCORE_POLICY, getBacklogInsights } from "./control"
import type { BacklogItem, Roadmap } from "../domain/schemas"

function goal(id: string, score: 0 | 1, evidence: string[] = []) {
  return { id, ordinal: Number(id.replace(/\D/g, "")) || 1, title: id, outcome: "", category: "quality" as const, score, evidence }
}

function roadmap(): Roadmap {
  const make = (slug: "app" | "docs" | "features-domains", title: string, score: 0 | 1, evidence: string[] = []) => ({
    id: `scorecard_${slug}-00000000-0000-0000-0000-000000000000`,
    slug,
    title,
    description: "",
    scope: slug === "app" ? "workbench_app" as const : slug === "docs" ? "workbench_docs" as const : "workbench_features" as const,
    goals: Array.from({ length: 100 }, (_, index) => goal(`goal-${index + 1}`, score, evidence)),
  })
  return { schemaVersion: 1, projectId: "matriz-workbench", phases: [], goals: [], scorecards: [make("app", "App", 1, ["build passou"]), make("docs", "Docs", 0), make("features-domains", "Features", 0)], updatedAt: new Date().toISOString(), revision: "1234567890abcdef" }
}

describe("control score", () => {
  it("calcula média ponderada somente com evidência aprovada", () => {
    const summary = buildScoreSummary(roadmap(), DEFAULT_SCORE_POLICY, [])
    expect(summary.aggregate).toBe(45)
    expect(summary.tracks[0]).toMatchObject({ slug: "app", score: 100, approved: 100 })
    expect(summary.tracks[1]).toMatchObject({ slug: "docs", score: 0, pending: 100 })
  })

  it("mantém propostas pendentes fora do agregado", () => {
    const summary = buildScoreSummary(roadmap(), DEFAULT_SCORE_POLICY, [{
      schemaVersion: 1,
      id: "evp_00000000-0000-0000-0000-000000000000",
      projectId: "matriz-workbench",
      scorecardSlug: "docs",
      goalId: "goal-1",
      claim: "docs",
      references: [],
      source: "codex",
      status: "proposed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: "1234567890abcdef",
    }])
    expect(summary.aggregate).toBe(45)
    expect(summary.tracks[1].pending).toBe(100)
  })
})

describe("backlog insights", () => {
  it("prioriza bloqueios e tarefas sem critérios", () => {
    const item = (status: BacklogItem["status"], priority: BacklogItem["priority"], criteria: number): BacklogItem => ({
      schemaVersion: 1, id: "tsk_00000000-0000-0000-0000-000000000000", projectId: "spot", title: "Tarefa", description: "", status, priority, workScope: { kind: "project" }, tags: [], dependencyIds: [], references: [], acceptanceCriteria: Array.from({ length: criteria }, (_, i) => ({ id: `ac_${String(i).padStart(36, "0")}`, text: "critério", completed: false })), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), revision: "1234567890abcdef",
    })
    const insights = getBacklogInsights([item("blocked", "high", 1), item("idea", "critical", 0)])
    expect(insights[0].kind).toBe("blocked")
    expect(insights[1].kind).toBe("missing_context")
  })
})
