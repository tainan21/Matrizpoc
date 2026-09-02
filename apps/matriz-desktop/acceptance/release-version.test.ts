import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import { manifest } from "../src/manifest/manifest"

describe("Matriz Control v1 release identity", () => {
  it("publishes one version across the web, native, Tauri, and manifest authorities", async () => {
    const [packageJson, tauriConfig, cargoManifest] = await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse) as Promise<{ version: string }>,
      readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8").then(JSON.parse) as Promise<{ version: string; plugins?: { updater?: { endpoints?: unknown[]; pubkey?: string } } }>,
      readFile(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8"),
    ])
    const cargoVersion = cargoManifest.match(/^version = "([^"]+)"$/m)?.[1]

    expect({
      package: packageJson.version,
      tauri: tauriConfig.version,
      cargo: cargoVersion,
      manifest: manifest.version,
    }).toEqual({
      package: "1.1.0",
      tauri: "1.1.0",
      cargo: "1.1.0",
      manifest: "1.1.0",
    })
    expect(tauriConfig.plugins?.updater).toEqual({ endpoints: [], pubkey: "" })
  })
})
