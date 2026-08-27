import { describe, expect, it } from "vitest"
import { presentHome } from "./home-presenter"

describe("presentHome", () => {
  it("keeps available providers when another provider fails", () => {
    const view = presentHome({
      git: { status: "fulfilled", value: { branch: "main", status: "Limpo", attention: "none", changeTotal: 0, ahead: 0, behind: 0, head: "abcdef1", subject: "baseline", changes: [] } },
      projects: { status: "fulfilled", value: [{ id: "matriz-control", name: "matriz-control", port: 3009 }] },
      doctor: { status: "rejected", reason: "indisponível" },
    })
    expect(view.git?.branch).toBe("main")
    expect(view.projects).toHaveLength(1)
    expect(view.unavailable).toEqual(["doctor"])
  })
})
