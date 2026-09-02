import { manifest } from "../manifest/manifest"

export function bootstrapNaevia() {
  return { appId: manifest.appId, runtime: "electron" as const, version: manifest.version }
}
