import { describe, expect, it } from "vitest"
import { createControlHostHealthSnapshot } from "./host-health-snapshot"
import type { BrowserTab } from "../domain/browser"

describe("Control host health snapshot", () => {
  it("reports only aggregate open and suspended tab counts", () => {
    const tabs: BrowserTab[] = [
      { id: "tab_1", capsuleId: "capsule_1", url: "https://one.example", title: "One", status: "ready", pinnedLive: false, active: true, lastActiveAt: "2026-08-25T12:00:00.000Z" },
      { id: "tab_2", capsuleId: "capsule_1", url: "https://two.example", title: "Two", status: "suspended", pinnedLive: false, active: false, lastActiveAt: "2026-08-25T11:00:00.000Z" },
      { id: "tab_3", capsuleId: "capsule_2", url: "https://three.example", title: "Three", status: "loading", pinnedLive: false, active: false, lastActiveAt: "2026-08-25T10:00:00.000Z" },
    ]

    expect(createControlHostHealthSnapshot(tabs, "2026-08-25T12:00:00.000Z")).toEqual({
      version: "v1",
      sampledAt: "2026-08-25T12:00:00.000Z",
      openTabs: 3,
      suspendedTabs: 1,
    })
  })
})
