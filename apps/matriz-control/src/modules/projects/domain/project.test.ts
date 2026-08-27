import { describe, expect, it } from "vitest"
import { approveRecipe, createProjectRegistration, PROJECT_STATES } from "./project"

describe("project registration", () => {
  it("exposes the complete honest state vocabulary without a native path", () => {
    expect(PROJECT_STATES).toEqual([
      "unknown", "inspecting", "needs_review", "ready", "preparing", "starting",
      "running", "degraded", "stopping", "stopped", "blocked", "failed",
    ])
    const registration = createProjectRegistration({
      id: "project_1",
      displayName: "External Demo",
      canonicalRootRef: "root_1",
      source: "local",
      recipeRevision: "rev_1",
      now: "2026-08-27T12:00:00.000Z",
    })
    expect(registration).toEqual({
      id: "project_1",
      displayName: "External Demo",
      canonicalRootRef: "root_1",
      source: "local",
      trust: "unreviewed",
      recipeRevision: "rev_1",
      state: "needs_review",
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-27T12:00:00.000Z",
    })
    expect(JSON.stringify(registration)).not.toContain("C:\\")
  })

  it("approves only the current recipe revision and leaves the original immutable", () => {
    const registration = createProjectRegistration({ id: "p", displayName: "P", canonicalRootRef: "root", source: "local", recipeRevision: "rev-1", now: "2026-08-27T12:00:00.000Z" })
    expect(() => approveRecipe(registration, "rev-stale", "2026-08-27T12:01:00.000Z")).toThrow("Recipe revision is stale")
    const approved = approveRecipe(registration, "rev-1", "2026-08-27T12:01:00.000Z")
    expect(approved).toMatchObject({ trust: "reviewed", state: "ready", updatedAt: "2026-08-27T12:01:00.000Z" })
    expect(registration).toMatchObject({ trust: "unreviewed", state: "needs_review" })
  })
})
