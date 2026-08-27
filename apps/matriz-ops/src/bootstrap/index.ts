import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest } from "../manifest/manifest"

let booted = false
export function bootstrapMatrizOps() {
  if (!booted) {
    getGlobalRegistry().registerApp(manifest, { baseUrl: monorepoConfig.baseUrls[manifest.appId], enabled: true })
    booted = true
  }
  return { appId: manifest.appId }
}
