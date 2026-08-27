import { describe, expect, it } from "vitest"
import { transitionProject } from "./state-machine"
import type { ProjectState } from "./project"

describe("project state machine", () => {
  const allowed: ReadonlyArray<readonly [ProjectState, ProjectState]> = [
    ["unknown", "inspecting"], ["inspecting", "needs_review"], ["needs_review", "ready"],
    ["ready", "preparing"], ["preparing", "ready"], ["ready", "starting"],
    ["starting", "running"], ["starting", "degraded"], ["starting", "failed"],
    ["running", "degraded"], ["running", "stopping"], ["degraded", "stopping"],
    ["stopping", "stopped"], ["stopped", "starting"], ["ready", "needs_review"],
    ["running", "needs_review"], ["stopped", "needs_review"],
  ]

  it.each(allowed)("allows %s → %s", (from, to) => {
    expect(transitionProject(from, to)).toBe(to)
  })

  it.each([
    ["unknown", "running"], ["needs_review", "starting"], ["failed", "running"],
    ["blocked", "running"], ["stopping", "ready"],
  ] satisfies ReadonlyArray<readonly [ProjectState, ProjectState]>)("denies %s → %s", (from, to) => {
    expect(() => transitionProject(from, to)).toThrow(`Invalid project transition: ${from} -> ${to}`)
  })
})
