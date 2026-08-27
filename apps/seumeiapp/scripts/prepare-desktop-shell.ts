import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

type AppPackage = { name: string; version: string }
type Environment = Readonly<Record<string, string | undefined>>

export function embedTrustedOrigins(compiledConfig: string, environment: Environment): string {
  const appUrl = trustedUrl(environment.SEUMEI_DESKTOP_APP_URL, "SEUMEI_DESKTOP_APP_URL")
  const hubUrl = trustedUrl(environment.SEUMEI_DESKTOP_HUB_URL, "SEUMEI_DESKTOP_HUB_URL")
  return compiledConfig.replaceAll("__SEUMEI_DESKTOP_APP_URL__", appUrl).replaceAll("__SEUMEI_DESKTOP_HUB_URL__", hubUrl)
}

function trustedUrl(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required at build time`)
  let parsed: URL
  try { parsed = new URL(value) } catch { throw new Error(`${name} must be a valid URL`) }
  if (parsed.protocol !== "https:") throw new Error(`${name} must be HTTPS`)
  if (parsed.username || parsed.password) throw new Error(`${name} must not include credentials`)
  return parsed.href
}

async function main(): Promise<void> {
  const compiledDirectory = resolve("desktop-dist")
  const stageDirectory = resolve("desktop-stage")
  const appPackage = JSON.parse(await readFile(resolve("package.json"), "utf8")) as AppPackage

  await rm(stageDirectory, { recursive: true, force: true })
  await mkdir(stageDirectory, { recursive: true })
  await cp(compiledDirectory, stageDirectory, { recursive: true })
  const buildConfigPath = resolve(stageDirectory, "build-config.js")
  await writeFile(buildConfigPath, embedTrustedOrigins(await readFile(buildConfigPath, "utf8"), process.env), "utf8")
  await writeFile(resolve(stageDirectory, "package.json"), `${JSON.stringify({
    name: "seumei-desktop-shell",
    version: appPackage.version,
    private: true,
    main: "main.js",
    type: "commonjs",
    dependencies: { "electron-updater": "6.8.9" },
  }, null, 2)}\n`, "utf8")
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
