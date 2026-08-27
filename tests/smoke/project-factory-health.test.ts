import { describe, expect, it } from "vitest"
import { GET as hubHealth } from "../../apps/matriz-hub/app/api/health/route"
import { GET as spotHealth } from "../../apps/spot/app/api/health/route"
import { GET as seumeiHealth } from "../../apps/seumeiapp/app/api/health/route"
import { GET as adminHealth } from "../../apps/matriz-admin/app/api/health/route"
import { GET as matrizlibHealth } from "../../apps/matrizlib/app/api/health/route"
import { GET as controlHealth } from "../../apps/matriz-control/app/api/health/route"
import { GET as contractsHealth } from "../../apps/contracts/app/api/health/route"
import { GET as willdashHealth } from "../../apps/willdash/app/api/health/route"
import { GET as workbenchHealth } from "../../apps/matriz-workbench/app/api/health/route"
import { GET as sitesHealth } from "../../apps/sites/app/api/health/route"

describe("project factory health contract", () => {
  it("is uniform across all local apps", async () => {
    const handlers = [
      ["matriz-hub", hubHealth],
      ["spot", spotHealth],
      ["seumei", seumeiHealth],
      ["matriz-admin", adminHealth],
      ["matrizlib", matrizlibHealth],
      ["matriz-control", controlHealth],
      ["contracts", contractsHealth],
      ["willdash", willdashHealth],
      ["matriz-workbench", workbenchHealth],
      ["sites", sitesHealth],
    ] as const

    for (const [appId, handler] of handlers) {
      const response = await handler()
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        status: "ok",
        appId,
        contractVersion: "v1",
      })
    }
  })
})
