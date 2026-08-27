import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest } from "../manifest/manifest"

let booted = false
export function bootstrapMatrizControl() {
  if (!booted) { getGlobalRegistry().registerApp(manifest, { baseUrl: monorepoConfig.baseUrls["matriz-control"], enabled: true }); booted = true }
  return { appId: manifest.appId, projectHost: { mode: "desktop-required" as const } }
}
