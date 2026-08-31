import { describe, expect, it } from "vitest"
import { readCachedDashboard, writeCachedDashboard } from "./dashboard-cache"
import { unavailableDashboard } from "../application/fallback-dashboard"

describe("tenant-scoped dashboard cache", () => {
  it("never returns another tenant dashboard", () => {
    writeCachedDashboard(localStorage, unavailableDashboard("tenant-a", "A"))
    expect(readCachedDashboard(localStorage, "tenant-b")).toBeNull()
  })

  it("marks a cached dashboard as stale", () => {
    writeCachedDashboard(localStorage, unavailableDashboard("tenant-a", "A"))
    expect(readCachedDashboard(localStorage, "tenant-a")?.sections.systems.state).toBe("stale")
  })
})
