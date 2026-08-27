import path from "node:path"
import { readFile } from "node:fs/promises"
import { writeWorkbenchReleaseManifest } from "../src/native-desktop/release-manifest"

const packageJson = JSON.parse(await readFile(path.resolve(import.meta.dirname, "..", "package.json"), "utf8")) as { version?: unknown }
if (typeof packageJson.version !== "string") throw new Error("A versão do Workbench não está definida no package.json.")
const releaseDirectory = path.resolve(process.env.WORKBENCH_RELEASE_OUTPUT_DIR ?? path.resolve(import.meta.dirname, "..", "release"))
const setupFile = `matriz-workbench-${packageJson.version}-windows-x64-setup.exe`
await writeWorkbenchReleaseManifest({
  version: packageJson.version,
  setupPath: path.join(releaseDirectory, setupFile),
  manifestPath: path.join(releaseDirectory, "release-manifest.json"),
  signaturePath: path.join(releaseDirectory, "release-manifest.json.sig"),
  downloadBaseUrl: process.env.WORKBENCH_RELEASE_BASE_URL ?? "",
  releasedAt: process.env.WORKBENCH_RELEASED_AT ?? new Date().toISOString(),
  minimumControlVersion: process.env.WORKBENCH_MINIMUM_CONTROL_VERSION ?? "0.1.0",
  privateKeyPem: process.env.WORKBENCH_STORE_MANIFEST_PRIVATE_KEY ?? "",
})
