/**
 * build-app.ts
 *
 * Thin, opinionated wrapper around `pnpm turbo run build --filter=<app>`.
 * Validates the target app id, runs boundary verification first, then builds
 * only that app (plus its workspace dependencies), producing a deploy-ready
 * artifact under `apps/<app>/.next`.
 *
 * Usage:
 *   pnpm tsx tooling/scripts/build-app.ts matriz-hub
 *   pnpm tsx tooling/scripts/build-app.ts spot --skip-boundaries
 */
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const KNOWN_APPS = ["matriz-hub", "spot", "seumei", "contracts", "willdash"] as const
type AppId = (typeof KNOWN_APPS)[number]

function fail(msg: string): never {
  console.error(`[build-app] ${msg}`)
  process.exit(1)
}

function parseArgs(): { app: AppId; skipBoundaries: boolean } {
  const [, , rawApp, ...rest] = process.argv
  if (!rawApp) fail(`missing app id — expected one of: ${KNOWN_APPS.join(", ")}`)
  if (!KNOWN_APPS.includes(rawApp as AppId)) fail(`unknown app "${rawApp}"`)
  return { app: rawApp as AppId, skipBoundaries: rest.includes("--skip-boundaries") }
}

function run(cmd: string, args: string[], cwd: string): void {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" })
  if (res.status !== 0) fail(`command failed: ${cmd} ${args.join(" ")}`)
}

function main(): void {
  const { app, skipBoundaries } = parseArgs()
  const root = resolve(__dirname, "..", "..")

  console.log(`[build-app] target = @matriz/app-${app}`)

  if (!skipBoundaries) {
    console.log("[build-app] step 1/2: boundary verification")
    run("pnpm", ["tsx", "tooling/scripts/verify-app-boundaries.ts", app], root)
  }

  console.log("[build-app] step 2/2: turbo build")
  run("pnpm", ["turbo", "run", "build", `--filter=@matriz/app-${app}...`], root)

  console.log(`[build-app] done — artifact at apps/${app}/.next`)
}

main()
