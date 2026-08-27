import { describe, expect, it } from "vitest"
import { cpuUsagePercent, memoryUsagePercent, sensorReading } from "./system-health"

describe("system health calculations", () => {
  it("calculates bounded memory and CPU percentages", () => {
    expect(memoryUsagePercent(75, 100)).toBe(75)
    expect(memoryUsagePercent(120, 100)).toBe(100)
    expect(memoryUsagePercent(1, 3)).toBe(33.3)
    expect(cpuUsagePercent({ idle: 20, total: 100 }, { idle: 30, total: 140 })).toBe(75)
  })

  it("marks missing temperature as unavailable", () => {
    expect(sensorReading(null, "celsius")).toEqual({
      availability: "unavailable",
      value: null,
      unit: "celsius",
    })
    expect(sensorReading(Number.POSITIVE_INFINITY, "celsius")).toEqual({
      availability: "unavailable",
      value: null,
      unit: "celsius",
    })
  })
})
