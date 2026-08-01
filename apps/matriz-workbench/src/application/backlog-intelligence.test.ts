import { describe, expect, it } from "vitest"
import type { BacklogItem } from "../domain/schemas"
import { analyzeBacklogItem } from "./backlog-intelligence"

const task = (overrides: Partial<BacklogItem> = {}): BacklogItem => ({
  schemaVersion: 1,
  id: "tsk_11111111-1111-1111-1111-111111111111",
  projectId: "sample",
  title: "Preparar uma tarefa",
  description: "",
  status: "idea",
  priority: "medium",
  workScope: { kind: "project" },
  tags: [],
  acceptanceCriteria: [],
  dependencyIds: [],
  references: [],
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
  revision: "revision-1",
  ...overrides,
})

describe("analyzeBacklogItem", () => {
  it("explains missing context without spending model tokens", () => {
    const result = analyzeBacklogItem(task(), [])
    expect(result.readiness).toBe(20)
    expect(result.nextAction).toBe("Completar contexto")
    expect(result.missingContext).toContain("critérios de aceite")
  })

  it("surfaces unresolved dependencies before suggesting Codex", () => {
    const dependency = task({
      id: "tsk_22222222-2222-2222-2222-222222222222",
      status: "in_progress",
    })
    const item = task({
      status: "ready",
      description: "Contexto suficientemente detalhado para que o trabalho possa ser executado com segurança.",
      tags: ["docs"],
      acceptanceCriteria: [{
        id: "ac_33333333-3333-3333-3333-333333333333",
        text: "Resultado verificável",
        completed: false,
      }],
      dependencyIds: [dependency.id],
    })
    const result = analyzeBacklogItem(item, [item, dependency])
    expect(result.blockedBy).toEqual([dependency.id])
    expect(result.nextAction).toContain("Resolver")
  })
})
