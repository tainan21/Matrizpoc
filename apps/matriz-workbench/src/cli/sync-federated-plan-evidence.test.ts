import { describe, expect, it } from "vitest"
import type { Roadmap } from "../domain/schemas"
import {
  projectEvidence,
  type EvidenceMap,
  type ExactGoalBindings,
} from "./sync-federated-plan-evidence"

function roadmap(goal: {
  id: string
  title: string
  score: 0 | 1
  evidence: string[]
}): Roadmap {
  return {
    schemaVersion: 1,
    projectId: "matriz-workbench",
    phases: [],
    markers: [],
    goals: [],
    scorecards: [
      {
        id: "scorecard_00000000-0000-4000-8000-000000000001",
        slug: "features-domains",
        title: "Features",
        description: "",
        scope: "workbench_features",
        goals: [
          {
            ...goal,
            ordinal: 53,
            outcome: "Evidência humana preservada.",
            category: "collaboration",
          },
        ],
      },
    ],
    updatedAt: "2026-07-30T00:00:00.000Z",
    revision: "revision-1",
  } as Roadmap
}

const evidence: EvidenceMap = {
  "features-domains": {
    53: ["docs/z.md", "docs/a.md"],
  },
}

const bindings: ExactGoalBindings = {
  "features-domains": {
    53: {
      id: "goal_00000000-0000-4000-8000-000000000053",
      title: "Estabelecer contratos de documentação e conhecimento conectado",
    },
  },
}

describe("projectEvidence", () => {
  it("preserves human evidence, reports exact deltas and is idempotent", () => {
    const current = roadmap({
      id: bindings["features-domains"][53].id,
      title: bindings["features-domains"][53].title,
      score: 0,
      evidence: ["docs/human.md", "docs/z.md"],
    })

    const first = projectEvidence(
      current,
      "matriz-workbench",
      evidence,
      bindings,
    )

    expect(first.changed).toBe(true)
    expect(first.scorecards[0].goals[0].evidence).toEqual([
      "docs/a.md",
      "docs/human.md",
      "docs/z.md",
    ])
    expect(first.deltas).toEqual([
      {
        scorecardSlug: "features-domains",
        ordinal: 53,
        goalId: bindings["features-domains"][53].id,
        title: bindings["features-domains"][53].title,
        newlyScored: true,
        evidenceAdded: ["docs/a.md"],
      },
    ])

    const second = projectEvidence(
      { ...current, scorecards: first.scorecards },
      "matriz-workbench",
      evidence,
      bindings,
    )

    expect(second.changed).toBe(false)
    expect(second.deltas).toEqual([])
  })

  it("fails before projection when an exact goal identity drifts", () => {
    const current = roadmap({
      id: "goal_00000000-0000-4000-8000-000000000099",
      title: bindings["features-domains"][53].title,
      score: 0,
      evidence: [],
    })

    expect(() =>
      projectEvidence(current, "matriz-workbench", evidence, bindings),
    ).toThrow(
      "Goal binding changed for matriz-workbench/features-domains/53.",
    )
  })

  it("treats evidence order as semantically unchanged", () => {
    const current = roadmap({
      id: bindings["features-domains"][53].id,
      title: bindings["features-domains"][53].title,
      score: 1,
      evidence: ["docs/z.md", "docs/a.md"],
    })

    const projection = projectEvidence(
      current,
      "matriz-workbench",
      evidence,
      bindings,
    )

    expect(projection.changed).toBe(false)
    expect(projection.deltas).toEqual([])
  })
})
