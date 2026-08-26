import { describe, expect, it } from "vitest"
import { classifyDrive, classifyProjectCache, classifyRam, sumProcessTree } from "./system-inspector"

describe("system inspector", () => {
  it("classifies resource thresholds and preserves unknown values", () => {
    expect(classifyDrive({ totalBytes: 100, freeBytes: 14 })).toBe("warning")
    expect(classifyDrive({ totalBytes: 100, freeBytes: 7 })).toBe("critical")
    expect(classifyProjectCache(1_100_000_000)).toBe("warning")
    expect(classifyProjectCache(3_100_000_000)).toBe("critical")
    expect(classifyRam(1_600_000_000)).toBe("warning")
    expect(classifyRam(null)).toBe("unknown")
  })

  it("aggregates only a managed process tree", () => {
    const rows = [
      { pid: 10, parentPid: 1, memoryBytes: 100 },
      { pid: 11, parentPid: 10, memoryBytes: 50 },
      { pid: 12, parentPid: 11, memoryBytes: 25 },
      { pid: 99, parentPid: 1, memoryBytes: 900 },
    ]
    expect(sumProcessTree(10, rows)).toBe(175)
    expect(sumProcessTree(null, rows)).toBeNull()
  })
})
