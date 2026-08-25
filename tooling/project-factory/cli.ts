import path from "node:path"
import { pathToFileURL } from "node:url"
import { readFile } from "node:fs/promises"
import { localAppCatalog } from "./catalog"
import { getLocalApp, loadLocalAppCatalog } from "./catalog-loader"
import { formatAppInfo } from "./commands/info"
import { runLocalApp, type RunningApp } from "./commands/dev"
import { parseApplicationBlueprint, planApplicationScaffold } from "./blueprints/plan"
import { applyScaffoldPlan } from "./blueprints/apply"
import { applySafeImport, inspectImportSource, planSafeImport } from "./import/safe-import"
import { runAppChecks } from "./commands/check"

export interface CliDependencies {
  readonly repositoryRoot: string
  readonly write: (message: string) => void
  readonly runLocalApp?: (
    app: (typeof localAppCatalog)[number],
    repositoryRoot: string,
  ) => Promise<RunningApp>
}

const USAGE = "Usage: pnpm app <info|dev|check> <slug> | pnpm app create <blueprint.json> <--preview|--apply> | pnpm app import <source> --slug <slug> --snapshot <id> <--preview|--apply>"

function flagValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
): Promise<number> {
  const [command, target, mode] = args
  if (!command || !target) {
    dependencies.write(USAGE)
    return 1
  }
  try {
    if (command === "import") {
      const slug = flagValue(args, "--slug")
      const snapshotId = flagValue(args, "--snapshot")
      const importMode = args.includes("--apply") ? "--apply" : args.includes("--preview") ? "--preview" : undefined
      if (!slug || !snapshotId || !importMode) {
        throw new Error("Import requires --slug, --snapshot and exactly one of --preview or --apply.")
      }
      const inventory = await inspectImportSource(path.resolve(target))
      const plan = await planSafeImport(dependencies.repositoryRoot, slug, snapshotId, inventory)
      if (importMode === "--preview") {
        dependencies.write(JSON.stringify({
          operation: "import",
          sourceRoot: inventory.sourceRoot,
          targetRoot: plan.targetRoot,
          files: plan.operations.map(({ path: sourcePath, targetPath, status, contentHash }) => ({ sourcePath, targetPath, status, contentHash })),
          excluded: plan.excluded.map(({ path: excludedPath, reason }) => ({ path: excludedPath, reason })),
        }, null, 2))
        return plan.operations.some((operation) => operation.status === "conflict-existing") ? 1 : 0
      }
      const result = await applySafeImport(dependencies.repositoryRoot, plan)
      dependencies.write(`[factory] Imported ${result.created.length}; skipped ${result.skipped.length}; excluded ${plan.excluded.length}.`)
      return 0
    }

    if (command === "create") {
      if (mode !== "--preview" && mode !== "--apply") throw new Error("Create requires --preview or --apply.")
      const blueprint = parseApplicationBlueprint(JSON.parse(await readFile(path.resolve(target), "utf8")))
      const plan = await planApplicationScaffold(dependencies.repositoryRoot, blueprint)
      if (mode === "--preview") {
        dependencies.write(JSON.stringify({
          operation: "create",
          slug: blueprint.slug,
          files: plan.operations.map(({ path, status, contentHash }) => ({ path, status, contentHash })),
        }, null, 2))
        return plan.operations.some((operation) => operation.status === "conflict-existing") ? 1 : 0
      }
      const result = await applyScaffoldPlan(dependencies.repositoryRoot, plan)
      dependencies.write(`[factory] Created ${result.created.length}; skipped ${result.skipped.length}.`)
      return 0
    }

    const slug = target
    const app = getLocalApp(localAppCatalog, slug)
    const catalog = await loadLocalAppCatalog(dependencies.repositoryRoot)
    if (catalog.issues.length) throw new Error(catalog.issues.join("\n"))
    const resolved = catalog.apps.find((entry) => entry.appId === app.appId)
    if (!resolved) throw new Error(`Package for app "${slug}" was not resolved.`)

    if (command === "info") {
      dependencies.write(formatAppInfo(app, resolved.packageName))
      return 0
    }
    if (command === "check") {
      runAppChecks(app.appId, resolved.packageName, dependencies.repositoryRoot)
      dependencies.write(`[factory] Checks passed for ${app.slug}.`)
      return 0
    }
    if (command === "dev") {
      dependencies.write(`[factory] Starting ${app.appId} at http://${app.host}:${app.preferredPort}`)
      const runner = dependencies.runLocalApp ?? runLocalApp
      const running = await runner(app, dependencies.repositoryRoot)
      const stop = () => { void running.stop() }
      process.once("SIGINT", stop)
      process.once("SIGTERM", stop)
      try {
        return await running.waitForExit()
      } finally {
        process.off("SIGINT", stop)
        process.off("SIGTERM", stop)
      }
    }
    dependencies.write(`Command "${command}" is not available yet. ${USAGE}`)
    return 1
  } catch (error) {
    dependencies.write(`[factory] ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ""
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  void runCli(process.argv.slice(2), {
      repositoryRoot: process.cwd(),
      write: (message) => process.stdout.write(`${message}\n`),
    })
    .then((exitCode) => { process.exitCode = exitCode })
    .catch((error) => {
      process.stderr.write(`[factory] ${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
