import { describe, expect, it } from "vitest"
import { acceptanceIdsForJourney } from "./evidence-map"

describe("acceptance evidence map", () => {
  it("maps only exact journeys with direct assertions", () => {
    expect(acceptanceIdsForJourney("streams cwd and Unicode output, then remains interactive after Ctrl+C")).toEqual(["TERM-001", "TERM-002", "TERM-003", "TERM-007"])
    expect(acceptanceIdsForJourney("exits without orphaning terminal children or persisting terminal output")).toEqual(["TERM-010", "TERM-011"])
    expect(acceptanceIdsForJourney("rejects missing and tampered native installers before execution")).toEqual(["NATIVE-003", "NATIVE-006"])
    expect(acceptanceIdsForJourney("keeps accessible navigation and catalog commands operational without sound")).toEqual(["SET-003", "NAV-003", "A11Y-003", "CMD-002", "CMD-004", "JUMP-001"])
    expect(acceptanceIdsForJourney("observes and terminates only harness-owned listener snapshots")).toEqual(["PORT-001", "PORT-003", "PORT-004", "PORT-005", "PORT-006", "PORT-007", "CMD-003"])
    expect(acceptanceIdsForJourney("degrades optional Doctor checks and rejects gates after workspace loss")).toEqual(["DOC-002", "ACT-003"])
    expect(acceptanceIdsForJourney("exits through the product command instead of external process termination")).toEqual(["LIFE-001", "LIFE-002", "LIFE-005", "LIFE-007"])
    expect(acceptanceIdsForJourney("recovers defaults from corrupt settings without destroying the source")).toEqual(["SET-002"])
    expect(acceptanceIdsForJourney("maps every canonical Matriz app to its fixed listener port")).toEqual(["PORT-002"])
    expect(acceptanceIdsForJourney("similar terminal test")).toEqual([])
  })

  it("maps each exercised app lifecycle without accepting unknown labels", () => {
    expect(acceptanceIdsForJourney("starts, owns, stops, and restarts Hub")).toEqual([
      "APP-MATRIZ-HUB-START", "APP-MATRIZ-HUB-READY", "APP-MATRIZ-HUB-STOP", "APP-MATRIZ-HUB-RESTART",
    ])
    expect(acceptanceIdsForJourney("starts, owns, stops, and restarts Unknown")).toEqual([])
  })
})
