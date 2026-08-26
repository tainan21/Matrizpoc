import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { InstalledAppsProvider, useInstalledApps } from "./installed-apps-context"

function StateProbe() {
  const { state, apps } = useInstalledApps()
  return <output>{`${state.installedIds.length}:${apps[0]?.installed}`}</output>
}

describe("installed apps context", () => {
  it("provides an SSR-safe empty installation state", () => {
    const markup = renderToStaticMarkup(<InstalledAppsProvider><StateProbe /></InstalledAppsProvider>)

    expect(markup).toBe("<output>0:false</output>")
  })
})
