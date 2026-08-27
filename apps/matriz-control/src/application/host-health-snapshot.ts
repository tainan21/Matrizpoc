import type { BrowserTab } from "../domain/browser"

export interface ControlHostHealthSnapshot {
  readonly version: "v1"
  readonly sampledAt: string
  readonly openTabs: number
  readonly suspendedTabs: number
}

export function createControlHostHealthSnapshot(tabs: readonly BrowserTab[], sampledAt: string): ControlHostHealthSnapshot {
  return {
    version: "v1",
    sampledAt,
    openTabs: tabs.length,
    suspendedTabs: tabs.filter((tab) => tab.status === "suspended").length,
  }
}
