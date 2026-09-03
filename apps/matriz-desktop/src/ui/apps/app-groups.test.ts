import { describe, expect, it } from "vitest"
import { defaultDesktopAppGroup, normalizeDesktopAppGroups, orderDesktopApps, reorderDesktopApps } from "./app-groups"

describe("desktop app groups", () => {
  it("starts the Matriz sequence with Hub and Workbench", () => {
    expect(orderDesktopApps(["spot", "matriz-workbench", "matriz-hub"])).toEqual(["matriz-hub", "matriz-workbench", "spot"])
    expect(defaultDesktopAppGroup().appIds.slice(0, 2)).toEqual(["matriz-hub", "matriz-workbench"])
  })

  it("restores the default group and removes unknown app ids", () => {
    expect(normalizeDesktopAppGroups([{ id: "qa", name: " QA ", appIds: ["spot", "unknown"] }])[0].name).toBe("Matriz")
    expect(normalizeDesktopAppGroups([{ id: "qa", name: "QA", appIds: ["spot", "unknown"] }])[1].appIds).toEqual(["spot"])
  })

  it("keeps drag and drop ordering deterministic", () => {
    expect(reorderDesktopApps(["matriz-hub", "spot", "contracts"], "contracts", "matriz-hub")).toEqual(["contracts", "matriz-hub", "spot"])
  })
})
