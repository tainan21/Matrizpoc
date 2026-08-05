import { describe, expect, it } from "vitest"
import type { WorkItem } from "../../domain/schemas"
import { toWorkItemDependencyMapViewModel } from "./work-item-dependency-presenter"

function workItem(id: string, patch: Partial<WorkItem> = {}): WorkItem {
  return {
    schemaVersion: 2,
    id,
    projectId: "matriz-workbench",
    kind: "feature",
    title: id,
    description: "",
    productStatus: "ready",
    validationStatus: "pending",
    humanReviewStatus: "pending",
    documentationStatus: "pending",
    priority: "medium",
    workScope: { kind: "project" },
    tags: [],
    acceptanceCriteria: [],
    dependencyIds: [],
    references: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    revision: "12345678",
    ...patch,
  }
}

const first = "tsk_00000000-0000-0000-0000-000000000001"
const second = "wi_00000000-0000-0000-0000-000000000002"
const missing = "wi_00000000-0000-0000-0000-000000000099"

describe("work item dependency presenter", () => {
  it("maps completed prerequisites as resolved and positions dependents later", () => {
    const result = toWorkItemDependencyMapViewModel([
      workItem(first, { productStatus: "completed" }),
      workItem(second, { dependencyIds: [first] }),
    ])

    expect(result.edges).toEqual([
      expect.objectContaining({ fromId: first, toId: second, health: "resolved" }),
    ])
    expect(result.nodes.find((node) => node.id === first)?.depth).toBe(0)
    expect(result.nodes.find((node) => node.id === second)?.depth).toBe(1)
    expect(result.nodes.find((node) => node.id === second)?.health).toBe("clear")
  })

  it("separates unresolved and missing dependencies", () => {
    const result = toWorkItemDependencyMapViewModel([
      workItem(first),
      workItem(second, { dependencyIds: [first, missing] }),
    ])

    expect(result.summary).toMatchObject({ connections: 2, waiting: 1, broken: 1 })
    expect(result.nodes.find((node) => node.id === second)?.health).toBe("broken")
    expect(result.nodes.find((node) => node.id === missing)).toMatchObject({ missing: true, health: "broken" })
  })

  it("detects a cycle without recursing indefinitely", () => {
    const result = toWorkItemDependencyMapViewModel([
      workItem(first, { dependencyIds: [second] }),
      workItem(second, { dependencyIds: [first] }),
    ])

    expect(result.summary.cycles).toBe(1)
    expect(result.edges.every((edge) => edge.health === "cycle")).toBe(true)
    expect(result.nodes.every((node) => node.health === "cycle")).toBe(true)
    expect(result.canvas.width).toBeGreaterThanOrEqual(960)
  })

  it("counts isolated work items without inventing relationships", () => {
    const result = toWorkItemDependencyMapViewModel([workItem(first), workItem(second)])

    expect(result.summary).toMatchObject({ items: 2, connections: 0, standalone: 2 })
    expect(result.edges).toEqual([])
  })

  it("keeps a referenced archived prerequisite distinct from a missing reference", () => {
    const result = toWorkItemDependencyMapViewModel([
      workItem(first, { productStatus: "archived" }),
      workItem(second, { dependencyIds: [first] }),
    ])

    expect(result.summary).toMatchObject({ connections: 1, waiting: 1, broken: 0 })
    expect(result.nodes.find((node) => node.id === first)).toMatchObject({
      missing: false,
      productStatus: "archived",
      statusLabel: "Arquivado",
    })
  })
})
