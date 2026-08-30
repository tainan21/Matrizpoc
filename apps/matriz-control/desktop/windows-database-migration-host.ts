import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { ManagedDatabaseSchema } from "../src/modules/infrastructure/application/database-migration-gate"

const executeFile = promisify(execFile)

type Options = Readonly<{
  helperPath: string
  migrationsRoot: string
  execute?(file: string, args: readonly string[]): Promise<void>
}>

export class WindowsDatabaseMigrationHost {
  constructor(private readonly options: Options) {}

  async apply(schema: ManagedDatabaseSchema): Promise<void> {
    try {
      await (this.options.execute ?? execute)("powershell.exe", [
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.options.helperPath,
        "-Schema", schema, "-MigrationsRoot", this.options.migrationsRoot,
      ])
    }
    catch { throw new Error(`Managed migration apply failed for ${schema}`) }
  }
}

async function execute(file: string, args: readonly string[]): Promise<void> {
  await executeFile(file, [...args], { windowsHide: true, timeout: 5 * 60_000, maxBuffer: 512 * 1024, encoding: "utf8" })
}
