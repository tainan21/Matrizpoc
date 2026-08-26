import { describe, expect, it } from "vitest"
import {
  activateApp,
  emptyInstalledAppsState,
  installApp,
  normalizeInstalledAppsState,
  uninstallApp,
} from "./installable-apps"

describe("installable apps domain", () => {
  it("normalizes unknown and duplicate ids", () => {
    expect(normalizeInstalledAppsState({ version: 1, installedIds: ["health", "unknown", "health"] }, ["health"]))
      .toEqual({ version: 1, installedIds: ["health"], activeAppId: null })
  })

  it("installs and uninstalls idempotently", () => {
    const installed = installApp(emptyInstalledAppsState(), "health", ["health"])

    expect(installApp(installed, "health", ["health"])).toEqual(installed)
    expect(uninstallApp({ ...installed, activeAppId: "health" }, "health")).toEqual(emptyInstalledAppsState())
  })

  it("only activates an installed app or clears the active app", () => {
    const installed = installApp(emptyInstalledAppsState(), "health", ["health"])

    expect(activateApp(installed, "health").activeAppId).toBe("health")
    expect(activateApp(installed, "unknown").activeAppId).toBeNull()
    expect(activateApp(installed, null).activeAppId).toBeNull()
  })
})
