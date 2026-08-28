import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest } from "../manifest/manifest"
let booted = false
export function bootstrapMatrizUninstall() {
  if (!booted) {
    getGlobalRegistry().registerApp(manifest, {
      baseUrl: monorepoConfig.baseUrls["matriz-uninstall"],
      enabled: true,
    })
    booted = true
  }
  return { appId: manifest.appId }
}
