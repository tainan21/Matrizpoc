import { execFile } from "node:child_process"
import { access, readFile } from "node:fs/promises"
import { win32 } from "node:path"
import { promisify } from "node:util"
import { infrastructureContractV1Schema } from "@matriz/integration-infrastructure-contracts"
import { resolveDeclaredEnvironment, type ResolvedLocalEnvironment } from "../src/modules/infrastructure/application/local-development-environment"

const executeFile = promisify(execFile)

type Options = {
  helperPath: string
  readFile?(path: string): Promise<string>
  fileExists?(path: string): Promise<boolean>
  execute?(file: string, args: readonly string[]): Promise<string>
}

export class WindowsLocalEnvironmentResolver {
  constructor(private readonly options: Options) {}

  async resolveMany(projectRoots: readonly string[]): Promise<ResolvedLocalEnvironment> {
    const values: Record<string, string> = {}
    const redactions = new Set<string>()
    for (const projectRoot of projectRoots) {
      const resolved = await this.resolve(projectRoot)
      for (const [name, value] of Object.entries(resolved.values)) {
        const existing = values[name]
        if (existing !== undefined && existing !== value) throw new Error(`Conflicting local environment value for ${name}`)
        values[name] = value
      }
      for (const value of resolved.redactions) redactions.add(value)
    }
    return { values, redactions: [...redactions] }
  }

  async resolve(projectRoot: string): Promise<ResolvedLocalEnvironment> {
    const contractPath = win32.join(projectRoot, "infrastructure.json")
    const exists = this.options.fileExists
      ? await this.options.fileExists(contractPath)
      : await access(contractPath).then(() => true, () => false)
    if (!exists) return { values: {}, redactions: [] }
    const contract = infrastructureContractV1Schema.parse(JSON.parse(await (this.options.readFile ?? ((path) => readFile(path, "utf8")))(contractPath)))
    const output = await (this.options.execute ?? execute)("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.options.helperPath,
      "-Action", "Resolve", "-AppId", contract.appId, "-ContractPath", contractPath,
    ])
    let values: unknown
    try { values = JSON.parse(output) } catch { throw new Error("Control vault returned an invalid environment response") }
    if (!values || typeof values !== "object" || Array.isArray(values) || Object.values(values).some((value) => typeof value !== "string")) throw new Error("Control vault returned an invalid environment response")
    return resolveDeclaredEnvironment(contract, values as Record<string, string>)
  }
}

async function execute(file: string, args: readonly string[]): Promise<string> {
  const result = await executeFile(file, [...args], { windowsHide: true, timeout: 15_000, maxBuffer: 512 * 1024, encoding: "utf8" })
  return result.stdout.trim()
}
