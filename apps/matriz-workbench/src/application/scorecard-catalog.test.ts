import { describe, expect, it } from "vitest"
import {
  INFRA_DOCS_SCORECARD_DEFINITION,
  WORKBENCH_SCORECARD_DEFINITIONS,
  createScorecard,
} from "./scorecard-catalog"

describe("scorecard catalog", () => {
  it("creates three independent Workbench tracks with 100 binary goals each", () => {
    const scorecards = WORKBENCH_SCORECARD_DEFINITIONS.map(createScorecard)
    expect(scorecards.map((scorecard) => scorecard.slug)).toEqual([
      "app",
      "docs",
      "features-domains",
    ])
    expect(scorecards.every((scorecard) => scorecard.goals.length === 100)).toBe(true)
    expect(scorecards.flatMap((scorecard) => scorecard.goals).every((goal) => goal.score === 0)).toBe(true)
  })

  it("creates the ecosystem documentation track separately", () => {
    const scorecard = createScorecard(INFRA_DOCS_SCORECARD_DEFINITION)
    expect(scorecard.scope).toBe("ecosystem_docs")
    expect(scorecard.goals).toHaveLength(100)
  })
})
