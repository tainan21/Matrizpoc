import { describe, expect, it } from "vitest"
import {
  activateApp,
  activateCapability,
  deactivateCapability,
  emptyInstalledAppsState,
  installApp,
  normalizeInstalledAppsState,
  uninstallApp,
} from "./installable-apps"

describe("installable apps domain", () => {
  it("normalizes unknown and duplicate ids", () => {
    expect(normalizeInstalledAppsState({ version: 1, installedIds: ["health", "unknown", "health"] }, ["health"]))
      .toEqual({ version: 2, installedIds: ["health"], activeIds: [], activeAppId: null })
  })

  it("rejects a persisted state from an unsupported version", () => {
    expect(normalizeInstalledAppsState({ version: 3, installedIds: ["health"], activeAppId: "health" }, ["health"]))
      .toEqual(emptyInstalledAppsState())
  })

  it("migrates the legacy active Health selection into an explicit activated capability", () => {
    expect(normalizeInstalledAppsState({ version: 1, installedIds: ["health"], activeAppId: "health" }, ["health"]))
      .toEqual({ version: 2, installedIds: ["health"], activeIds: ["health"], activeAppId: "health" })
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

  it("keeps capability activation independent from the currently open app", () => {
    const installed = installApp(emptyInstalledAppsState(), "health", ["health"])
    const activated = activateCapability(installed, "health")

    expect(activated).toMatchObject({ activeIds: ["health"], activeAppId: null })
    expect(deactivateCapability({ ...activated, activeAppId: "health" }, "health"))
      .toEqual({ version: 2, installedIds: ["health"], activeIds: [], activeAppId: null })
  })
})
