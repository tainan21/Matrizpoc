import { execFile } from "node:child_process"
import { access, chmod, readdir, readFile, rename, writeFile } from "node:fs/promises"
import { win32 } from "node:path"
import { promisify } from "node:util"
import type { ResolvedLocalEnvironment } from "../src/modules/infrastructure/application/local-development-environment"
import { serializeDevelopmentEnvironment, type LocalEnvironmentExportHost, type LocalEnvironmentExportInspection } from "../src/modules/infrastructure/application/local-environment-export-manager"

const executeFile = promisify(execFile)

type Options = Readonly<{
  workspaceRoot: string
  listDirectories?(path: string): Promise<readonly string[]>
  readFile?(path: string): Promise<string>
  fileExists?(path: string): Promise<boolean>
  gitIgnored?(path: string): Promise<boolean>
  resolveEnvironment(projectRoot: string): Promise<ResolvedLocalEnvironment>
  writeAtomic?(path: string, contents: string): Promise<void>
  restrictAcl?(path: string): Promise<void>
}>

export class WindowsLocalEnvironmentExportHost implements LocalEnvironmentExportHost {
  constructor(private readonly options: Options) {}

  async inspect(appId: string): Promise<LocalEnvironmentExportInspection> {
    const projectRoot = await this.findProjectRoot(appId)
    const target = win32.join(projectRoot, ".env.development.local")
    const [targetExists, gitIgnored] = await Promise.all([
      (this.options.fileExists ?? exists)(target),
      (this.options.gitIgnored ?? ((path) => isGitIgnored(this.options.workspaceRoot, path)))(target),
    ])
    return { appId, targetExists, gitIgnored }
  }

  async write(appId: string): Promise<void> {
    const projectRoot = await this.findProjectRoot(appId)
    const target = win32.join(projectRoot, ".env.development.local")
    const resolved = await this.options.resolveEnvironment(projectRoot)
    const contents = serializeDevelopmentEnvironment(resolved.values)
    await (this.options.writeAtomic ?? writeAtomic)(target, contents)
    await (this.options.restrictAcl ?? restrictAcl)(target)
  }

  private async findProjectRoot(appId: string): Promise<string> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(appId)) throw new Error("Invalid infrastructure app id")
    const appsRoot = win32.join(this.options.workspaceRoot, "apps")
    const directories = await (this.options.listDirectories ?? listDirectories)(appsRoot)
    for (const directory of directories) {
      const projectRoot = win32.join(appsRoot, directory)
      try {
        const contract = JSON.parse(await (this.options.readFile ?? readText)(win32.join(projectRoot, "infrastructure.json"))) as { schemaVersion?: unknown; appId?: unknown }
        if (contract.schemaVersion === "v1" && contract.appId === appId) return projectRoot
      }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
    }
    throw new Error("Unknown infrastructure app")
  }
}

async function listDirectories(path: string): Promise<readonly string[]> {
  return (await readdir(path, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

async function readText(path: string): Promise<string> { return readFile(path, "utf8") }
async function exists(path: string): Promise<boolean> { return access(path).then(() => true, () => false) }

async function isGitIgnored(workspaceRoot: string, path: string): Promise<boolean> {
  try {
    await executeFile("git.exe", ["-C", workspaceRoot, "check-ignore", "--quiet", "--", path], { windowsHide: true, timeout: 10_000 })
    return true
  }
  catch (error) { return (error as NodeJS.ErrnoException & { code?: number }).code === 1 ? false : Promise.reject(new Error("Git ignore verification failed")) }
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, contents, { encoding: "utf8", mode: 0o600, flag: "wx" })
  try { await rename(temporary, path); await chmod(path, 0o600) }
  catch (error) { throw new Error(`Atomic environment export failed: ${error instanceof Error ? error.message : "unknown error"}`) }
}

async function restrictAcl(path: string): Promise<void> {
  const domain = process.env.USERDOMAIN
  const username = process.env.USERNAME
  if (!domain || !username || !/^[\w .-]+$/.test(domain) || !/^[\w .-]+$/.test(username)) throw new Error("The current Windows account cannot secure the environment export")
  await executeFile("icacls.exe", [path, "/inheritance:r", "/grant:r", `${domain}\\${username}:(F)`], { windowsHide: true, timeout: 10_000 })
}
