import { describe, expect, it } from "vitest"
import { acceptanceIdsForJourney } from "./evidence-map"

describe("acceptance evidence map", () => {
  it("maps only exact journeys with direct assertions", () => {
    expect(acceptanceIdsForJourney("streams cwd and Unicode output, then remains interactive after Ctrl+C")).toEqual(["TERM-001", "TERM-002", "TERM-003", "TERM-007"])
    expect(acceptanceIdsForJourney("exits without orphaning terminal children or persisting terminal output")).toEqual(["TERM-010", "TERM-011"])
    expect(acceptanceIdsForJourney("rejects missing and tampered native installers before execution")).toEqual(["NATIVE-003", "NATIVE-006"])
    expect(acceptanceIdsForJourney("similar terminal test")).toEqual([])
  })

  it("maps each exercised app lifecycle without accepting unknown labels", () => {
    expect(acceptanceIdsForJourney("starts, owns, stops, and restarts Hub")).toEqual([
      "APP-MATRIZ-HUB-START", "APP-MATRIZ-HUB-READY", "APP-MATRIZ-HUB-STOP", "APP-MATRIZ-HUB-RESTART",
    ])
    expect(acceptanceIdsForJourney("starts, owns, stops, and restarts Unknown")).toEqual([])
  })
})
