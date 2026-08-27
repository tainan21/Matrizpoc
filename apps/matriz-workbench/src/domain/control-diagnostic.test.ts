import { describe, expect, it } from "vitest"
import {
  automaticRepairDecision,
  repairCooldownMs,
  repairFailureState,
  rerunRequestedState,
} from "./control-diagnostic"

describe("Control diagnostic repair policy", () => {
  it("uses the approved cooldown sequence", () => {
    expect([1, 2, 3].map(repairCooldownMs)).toEqual([30_000, 120_000, 600_000])
  })

  it("allows three automatic attempts and blocks the fourth", () => {
    expect(automaticRepairDecision(0)).toEqual({ allowed: true, nextAttempt: 1, cooldownMs: 30_000 })
    expect(automaticRepairDecision(2)).toEqual({ allowed: true, nextAttempt: 3, cooldownMs: 600_000 })
    expect(automaticRepairDecision(3)).toEqual({ allowed: false, reason: "attempt_limit" })
  })

  it("creates a single declared-action rerun lease after a successful repair turn", () => {
    expect(rerunRequestedState({ state: "repairing", repairAttempts: 1 }, "lease-1"))
      .toEqual({ state: "rerun_requested", rerunLease: "lease-1" })
  })

  it("cools down failed repairs and blocks the third attempt", () => {
    expect(repairFailureState(1, "2026-08-25T18:00:00.000Z")).toEqual({
      state: "cooling_down",
      cooldownUntil: "2026-08-25T18:00:30.000Z",
    })
    expect(repairFailureState(3, "2026-08-25T18:00:00.000Z")).toEqual({
      state: "blocked",
      cooldownUntil: undefined,
    })
  })
})
