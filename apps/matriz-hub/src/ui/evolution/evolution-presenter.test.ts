import { describe, expect, it } from "vitest"
import { presentEvolution } from "./evolution-presenter"

const backlog = [{
  id: "task-1",
  title: "Preparar publicação",
  description: "Validar a entrega.",
  status: "review",
  priority: "high",
  tags: ["release"],
  acceptanceCriteria: [
    { id: "a", text: "Testar", completed: true },
    { id: "b", text: "Aprovar", completed: false },
  ],
  updatedAt: "2026-08-12T10:00:00.000Z",
}]

const activity = [
  { id: "e1", actor: "codex", action: "feature.implemented", summary: "Entrega criada", entityType: "feature", entityId: "x", occurredAt: "2026-08-12T09:00:00.000Z" },
  { id: "e2", actor: "codex", action: "feature.validated", summary: "Entrega validada", entityType: "feature", entityId: "x", occurredAt: "2026-08-12T11:00:00.000Z" },
]

describe("evolution presenter", () => {
  it("keeps roadmap commitments separate from backlog ideas", () => {
    const vm = presentEvolution({ phases: [], goals: [], backlog, activity })
    expect(vm.declaredPhaseCount).toBe(0)
    expect(vm.work[0]).toMatchObject({ status: "approval", progress: 50 })
  })

  it("describes actors as historical instead of pretending they are live", () => {
    const vm = presentEvolution({ phases: [], goals: [], backlog, activity })
    expect(vm.actors[0]).toMatchObject({ name: "Codex", status: "archived", activityCount: 2 })
  })

  it("derives release records from real implementation and validation activity", () => {
    const vm = presentEvolution({ phases: [], goals: [], backlog, activity })
    expect(vm.releases.map((item) => item.status)).toEqual(["complete", "official"])
  })
})
