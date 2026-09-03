import { describe, expect, it } from "vitest"
import { createDefaultAppGroup, createGroupId, normalizeAppGroups, orderAppIds, reorderIds } from "./app-groups"

describe("app groups", () => {
  it("prioritizes Hub and Workbench in the default sequence", () => {
    expect(orderAppIds(["spot", "matriz-workbench", "matriz-hub", "willdash"])).toEqual(["matriz-hub", "matriz-workbench", "spot", "willdash"])
    expect(createDefaultAppGroup(["spot", "matriz-hub"]).projectIds).toEqual(["matriz-hub", "spot"])
  })

  it("keeps only known projects and always restores Matriz", () => {
    expect(normalizeAppGroups([{ id: "custom", name: "  QA ", projectIds: ["spot", "unknown", "spot"] }], ["matriz-hub", "spot"])).toEqual([
      { id: "matriz", name: "Matriz", projectIds: ["matriz-hub", "spot"] },
      { id: "custom", name: "QA", projectIds: ["spot"] },
    ])
  })

  it("reorders a group without losing members", () => {
    expect(reorderIds(["hub", "spot", "workbench"], "workbench", "hub")).toEqual(["workbench", "hub", "spot"])
    expect(createGroupId("Equipe / QA", ["equipe-qa"])).toBe("equipe-qa-2")
  })
})
