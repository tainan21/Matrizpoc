import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { manifest } from "../manifest/manifest"
let booted = false
export function bootstrapMatrizClientAdmin() { if (!booted) { getGlobalRegistry().registerApp(manifest, { baseUrl: "http://127.0.0.1:3013", enabled: true }); booted = true } return { appId: manifest.appId } }
