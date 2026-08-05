import { describe, expect, it } from "vitest"
import {
  AGENT_HANDBOOK_PATH,
  AGENT_OPERATING_SUMMARY,
  getAgentOperatingGuide,
} from "./agent-operating-summary"

describe("agent operating guide", () => {
  it("keeps the compact contract aligned with the canonical handbook", () => {
    const guide = getAgentOperatingGuide()

    expect(guide.handbookPath).toBe(AGENT_HANDBOOK_PATH)
    expect(guide.scoreModel).toMatchObject({ scale: "0-100", goals: 100, values: [0, 1] })
    expect(AGENT_OPERATING_SUMMARY).toContain(
      "A change may be recorded without changing the score",
    )
    expect(guide.multiagentPolicy).toContain("optional")
  })
})
