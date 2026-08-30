import { execFile } from "node:child_process"
import { access } from "node:fs/promises"
import { win32 } from "node:path"
import { promisify } from "node:util"
import type { ResolvedLocalEnvironment } from "../src/modules/infrastructure/application/local-development-environment"
import type { LocalDevelopmentSeedHost, LocalSeedPrerequisites } from "../src/modules/infrastructure/application/local-development-seed-manager"

const executeFile = promisify(execFile)
const seedAppDirectories = ["matriz-identity", "matriz-hub", "spot", "seumeiapp", "contracts", "willdash", "matriz-ops", "matriz-pay"] as const

type Execution = Readonly<{
  cwd: string
  environment: Readonly<Record<string, string>>
  redactions: readonly string[]
}>

type Options = Readonly<{
  workspaceRoot: string
  resolveEnvironment(projectRoots: readonly string[]): Promise<ResolvedLocalEnvironment>
  infrastructureStatus(): Promise<{ services: readonly { state: string }[] }>
  migrationStatus(): Promise<readonly { state: string }[]>
  fileExists?(path: string): Promise<boolean>
  execute?(file: string, args: readonly string[], options: Execution): Promise<void>
}>

export class WindowsLocalDevelopmentSeedHost implements LocalDevelopmentSeedHost {
  constructor(private readonly options: Options) {}

  async prerequisites(): Promise<LocalSeedPrerequisites> {
    const workspaceAvailable = await (this.options.fileExists ?? exists)(win32.join(this.options.workspaceRoot, "package.json"))
    const [infrastructure, migrations] = await Promise.all([this.options.infrastructureStatus(), this.options.migrationStatus()])
    return {
      workspaceAvailable,
      servicesHealthy: infrastructure.services.length === 3 && infrastructure.services.every((service) => service.state === "healthy"),
      migrationsClean: migrations.length === 8 && migrations.every((migration) => migration.state === "clean"),
    }
  }

  async execute(): Promise<void> {
    const roots = seedAppDirectories.map((directory) => win32.join(this.options.workspaceRoot, "apps", directory))
    const resolved = await this.options.resolveEnvironment(roots)
    const coreDatabaseUrl = resolved.values.CORE_RUNTIME_DATABASE_URL
    if (!coreDatabaseUrl) throw new Error("CORE_RUNTIME_DATABASE_URL is required for local seed execution")
    const environment = { ...resolved.values, MATRIZ_ENVIRONMENT: "local", CORE_DATABASE_URL: coreDatabaseUrl }
    const execution = { cwd: this.options.workspaceRoot, environment, redactions: resolved.redactions }
    const run = this.options.execute ?? execute
    await run("corepack.cmd", ["pnpm", "matriz:seed:dev"], execution)
    await run("corepack.cmd", ["pnpm", "--filter", "@matriz/app-matriz-identity", "seed:local"], execution)
  }
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false)
}

async function execute(file: string, args: readonly string[], options: Execution): Promise<void> {
  try {
    await executeFile(file, [...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.environment },
      windowsHide: true,
      timeout: 5 * 60_000,
      maxBuffer: 2 * 1024 * 1024,
      encoding: "utf8",
    })
  }
  catch (error) {
    const raw = error instanceof Error ? error.message : "Local seed execution failed"
    const sanitized = options.redactions.reduce((value, secret) => secret ? value.split(secret).join("[REDACTED]") : value, raw)
    throw new Error(sanitized)
  }
}
