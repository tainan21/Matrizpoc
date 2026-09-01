import { cp, mkdtemp, readFile, rm } from "node:fs/promises"
import { spawn } from "node:child_process"
import { extname, join, resolve } from "node:path"
import { tmpdir } from "node:os"

const requiredRuntimePackages = ["next", "@next/env", "@swc/helpers", "react"] as const

export type MaterializeStandaloneNodeModulesOptions = {
  deployedNodeModules: string
  standaloneNodeModules: string
}

type PnpmCommand = (command: string, args: string[]) => Promise<string>

export type PreparePackagedRuntimeOptions = {
  appDirectory?: string
  createTemporaryDirectory?: (prefix: string) => Promise<string>
  removeDirectory?: (directory: string) => Promise<void>
  deployRuntime?: (destination: string, monorepoRoot: string) => Promise<void>
  materializeRuntime?: (options: MaterializeStandaloneNodeModulesOptions) => Promise<void>
}

export async function materializeStandaloneNodeModules({ deployedNodeModules, standaloneNodeModules }: MaterializeStandaloneNodeModulesOptions) {
  await rm(standaloneNodeModules, { recursive: true, force: true })
  await cp(deployedNodeModules, standaloneNodeModules, { recursive: true, dereference: true, force: true })
  await validateRuntimePackages(standaloneNodeModules)
}

async function validateRuntimePackages(nodeModules: string) {
  await Promise.all(requiredRuntimePackages.map(async (packageName) => {
    const packageJsonPath = join(nodeModules, ...packageName.split("/"), "package.json")
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { name?: unknown }
    if (packageJson.name !== packageName) {
      throw new Error(`Expected packaged runtime dependency ${packageName} at ${packageJsonPath}`)
    }
  }))
}

export function resolvePnpmInvocation(pnpmEntrypoint: string) {
  return extname(pnpmEntrypoint).toLowerCase() === ".exe"
    ? { command: pnpmEntrypoint, args: [] as string[] }
    : { command: process.execPath, args: [pnpmEntrypoint] }
}

export function resolvePnpmDeployInvocation(pnpmEntrypoint: string, pnpmMajor: number, monorepoRoot: string, destination: string) {
  const invocation = resolvePnpmInvocation(pnpmEntrypoint)
  return {
    command: invocation.command,
    args: [
      ...invocation.args,
      "--config.node-linker=hoisted",
      "--filter", "@matriz/app-matriz-control",
      "deploy",
      ...(pnpmMajor >= 10 ? ["--legacy"] : []),
      "--prod",
      destination,
    ],
    cwd: monorepoRoot,
  }
}

function runPnpmCommand(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
    let output = ""
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString() })
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString() })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve(output) : reject(new Error(`pnpm exited with code ${code ?? "unknown"}`)))
  })
}

export async function readPnpmMajor(pnpmEntrypoint: string, execute: PnpmCommand = runPnpmCommand) {
  const invocation = resolvePnpmInvocation(pnpmEntrypoint)
  const output = await execute(invocation.command, [...invocation.args, "--version"])
  const match = output.match(/(\d+)\./)
  if (!match) throw new Error(`Could not determine pnpm version from ${JSON.stringify(output)}`)
  return Number(match[1])
}

function runPnpmDeploy(destination: string, monorepoRoot: string) {
  const pnpmEntrypoint = process.env.npm_execpath
  if (!pnpmEntrypoint) {
    throw new Error("desktop:prepare-runtime requires npm_execpath from pnpm")
  }
  return readPnpmMajor(pnpmEntrypoint).then((pnpmMajor) => runPnpmDeployWithMajor(pnpmEntrypoint, pnpmMajor, monorepoRoot, destination))
}

function runPnpmDeployWithMajor(pnpmEntrypoint: string, pnpmMajor: number, monorepoRoot: string, destination: string) {
  const invocation = resolvePnpmDeployInvocation(pnpmEntrypoint, pnpmMajor, monorepoRoot, destination)

  return new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, { cwd: invocation.cwd, shell: false, stdio: "inherit", windowsHide: true })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pnpm deploy exited with code ${code ?? "unknown"}`)))
  })
}

export async function preparePackagedRuntime(options: PreparePackagedRuntimeOptions = {}) {
  const createTemporaryDirectory = options.createTemporaryDirectory ?? ((prefix: string) => mkdtemp(prefix))
  const removeDirectory = options.removeDirectory ?? ((directory: string) => rm(directory, { recursive: true, force: true }))
  const deployRuntime = options.deployRuntime ?? runPnpmDeploy
  const materializeRuntime = options.materializeRuntime ?? materializeStandaloneNodeModules
  const deploymentRoot = await createTemporaryDirectory(join(tmpdir(), "matriz-control-runtime-"))
  const appDirectory = options.appDirectory ?? resolve(__dirname, "..")
  const standaloneNodeModules = join(appDirectory, ".next", "standalone", "apps", "matriz-control", "node_modules")

  try {
    await deployRuntime(deploymentRoot, resolve(appDirectory, "..", ".."))
    await materializeRuntime({
      deployedNodeModules: join(deploymentRoot, "node_modules"),
      standaloneNodeModules,
    })
  } finally {
    await removeDirectory(deploymentRoot)
  }
}

if (require.main === module) {
  preparePackagedRuntime().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
