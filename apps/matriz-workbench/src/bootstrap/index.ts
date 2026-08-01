import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest } from "../manifest/manifest"

let booted = false

export function bootstrapMatrizWorkbench(): { appId: string } {
  if (!booted) {
    getGlobalRegistry().registerApp(manifest, {
      baseUrl: monorepoConfig.baseUrls["matriz-workbench"],
      enabled: true,
    })
    booted = true
  }
  return { appId: manifest.appId }
}
