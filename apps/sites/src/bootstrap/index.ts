import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest } from "../manifest/manifest"

let booted = false

export function bootstrapSites(): { appId: string } {
  if (!booted) {
    getGlobalRegistry().registerApp(manifest, {
      baseUrl: monorepoConfig.baseUrls.sites,
      enabled: true,
    })
    booted = true
  }
  return { appId: manifest.appId }
}
