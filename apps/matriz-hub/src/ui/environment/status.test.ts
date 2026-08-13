import { describe, expect, it } from "vitest"
import { getStatusPresentation } from "./status"
import type { HubStatus } from "./types"

const statuses: readonly HubStatus[] = [
  "available",
  "running",
  "waiting",
  "attention",
  "approval",
  "blocked",
  "complete",
  "failed",
  "temporary",
  "official",
  "archived",
  "planned",
  "unavailable",
  "unknown",
]

describe("Hub status presentation", () => {
  it("gives every canonical state text and a non-color visual symbol", () => {
    for (const status of statuses) {
      expect(getStatusPresentation(status)).toMatchObject({
        label: expect.any(String),
        symbol: expect.stringMatching(/\S/),
      })
    }
  })

  it("does not collapse blocked and attention into the same meaning", () => {
    expect(getStatusPresentation("blocked")).not.toEqual(
      getStatusPresentation("attention"),
    )
  })
})
