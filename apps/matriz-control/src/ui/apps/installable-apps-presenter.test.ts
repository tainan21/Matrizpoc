import { describe, expect, it } from "vitest"
import { activateCapability, emptyInstalledAppsState, installApp } from "../../domain/installable-apps"
import { INSTALLABLE_APPS } from "../../integration/apps/installable-app-catalog"
import { toInstallableAppsViewModels } from "./installable-apps-presenter"

describe("installable apps presenter", () => {
  it("emits the smart app rail mutation only after Health is installed", () => {
    const available = toInstallableAppsViewModels(INSTALLABLE_APPS, emptyInstalledAppsState())
    const installed = toInstallableAppsViewModels(
      INSTALLABLE_APPS,
      activateCapability(installApp(emptyInstalledAppsState(), "health", ["health"]), "health"),
    )

    expect(available[0]).toMatchObject({ appId: "health", installed: false, shellMutationId: null })
    expect(installed[0]).toMatchObject({ appId: "health", installed: true, shellMutationId: "control.smart-app-rail" })
  })

  it("presents Windows packages from a renderer-safe native Store snapshot", () => {
    const apps = toInstallableAppsViewModels(INSTALLABLE_APPS, emptyInstalledAppsState(), [{
      appId: "matriz-workbench", kind: "windows_installer", state: "downloaded", version: null, availableVersion: "0.1.0", bytesDownloaded: 4, totalBytes: 4, message: "Instalador verificado e pronto.",
    }])

    expect(apps.find((app) => app.appId === "matriz-workbench")).toMatchObject({ appId: "matriz-workbench", kind: "windows_installer", nativeState: "downloaded", installed: false, availableVersion: "0.1.0" })
  })
})
