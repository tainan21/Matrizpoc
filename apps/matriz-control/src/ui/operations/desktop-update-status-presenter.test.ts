import { describe, expect, it } from "vitest"
import { presentEnvironmentUpdateStatus, presentPulseUpdateStatus } from "./desktop-update-status-presenter"

describe("desktop update status", () => {
  it("keeps web, loading, and desktop bridge failures explicit", () => {
    expect(presentPulseUpdateStatus({ runtime: "web" }).headline).toContain("Instalador indisponível")
    expect(presentPulseUpdateStatus({ runtime: "desktop", state: "loading" }).headline).toContain("Consultando")
    expect(presentPulseUpdateStatus({ runtime: "desktop", state: "failed" }).headline).toContain("Não foi possível")
  })

  it("does not present a failed store bridge as a missing update channel", () => {
    expect(presentEnvironmentUpdateStatus({ runtime: "desktop", state: "failed", appId: "matriz-control" })).toContain("Não foi possível")
    expect(presentEnvironmentUpdateStatus({ runtime: "web", state: "ready", appId: "matriz-control" })).toContain("navegador")
  })
})
