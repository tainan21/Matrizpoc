import { describe, expect, it } from "vitest"
import { emptyInstalledAppsState, installApp } from "../../domain/installable-apps"
import { INSTALLABLE_APPS } from "../../integration/apps/installable-app-catalog"
import { toInstallableAppsViewModels } from "./installable-apps-presenter"

describe("installable apps presenter", () => {
  it("emits the smart app rail mutation only after Health is installed", () => {
    const available = toInstallableAppsViewModels(INSTALLABLE_APPS, emptyInstalledAppsState())
    const installed = toInstallableAppsViewModels(
      INSTALLABLE_APPS,
      installApp(emptyInstalledAppsState(), "health", ["health"]),
    )

    expect(available[0]).toMatchObject({ appId: "health", installed: false, shellMutationId: null })
    expect(installed[0]).toMatchObject({ appId: "health", installed: true, shellMutationId: "control.smart-app-rail" })
  })
})
