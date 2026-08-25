import path from "node:path"
import { spawn as nodeSpawn } from "node:child_process"
import type { LocalAppRuntime } from "../catalog"
import { isPortAvailable } from "../runtime/port-check"
import { waitForHealth } from "../runtime/health-check"
import { terminateProcessTree } from "../process/terminate-tree"

export interface ProcessInvocation {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
}

interface SpawnedProcess {
  readonly pid?: number
  once(event: string, listener: (...args: any[]) => void): unknown
  kill?(signal?: NodeJS.Signals): boolean
}

export interface DevDependencies {
  readonly isPortAvailable: typeof isPortAvailable
  readonly spawn: (command: string, args: readonly string[], options: Record<string, unknown>) => SpawnedProcess
  readonly waitForHealth: typeof waitForHealth
  readonly write: (message: string) => void
  readonly terminate?: (pid: number) => Promise<void>
}

export interface RunningApp {
  readonly pid: number
  readonly url: string
  stop(): Promise<void>
  waitForExit(): Promise<number>
}

export function buildNextDevInvocation(
  app: LocalAppRuntime,
  repositoryRoot: string,
): ProcessInvocation {
  return {
    command: "pnpm",
    args: [
      "exec",
      "next",
      "dev",
      "-H",
      app.host,
      "-p",
      String(app.preferredPort),
    ],
    cwd: path.win32.normalize(path.win32.join(repositoryRoot, app.directory)),
  }
}

export function resolveExecutableInvocation(
  invocation: ProcessInvocation,
  platform: NodeJS.Platform,
  npmExecPath: string | undefined,
  nodeExecutable: string,
): ProcessInvocation {
  if (platform === "win32" && invocation.command === "pnpm" && npmExecPath) {
    if (!/\.(?:c?js|mjs)$/i.test(npmExecPath)) {
      return {
        command: npmExecPath,
        args: invocation.args,
        cwd: invocation.cwd,
      }
    }
    return {
      command: nodeExecutable,
      args: [npmExecPath, ...invocation.args],
      cwd: invocation.cwd,
    }
  }
  return invocation
}

export async function runLocalApp(
  app: LocalAppRuntime,
  repositoryRoot: string,
  dependencies: DevDependencies = {
    isPortAvailable,
    spawn: (command, args, options) => nodeSpawn(command, [...args], options),
    waitForHealth,
    write: (message) => process.stdout.write(`${message}\n`),
    terminate: terminateProcessTree,
  },
): Promise<RunningApp> {
  if (!(await dependencies.isPortAvailable(app.host, app.preferredPort))) {
    throw new Error(`port ${app.preferredPort} is already in use for ${app.slug}`)
  }
  const invocation = resolveExecutableInvocation(
    buildNextDevInvocation(app, repositoryRoot),
    process.platform,
    process.env.npm_execpath,
    process.execPath,
  )
  const child = dependencies.spawn(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    stdio: "inherit",
    shell: false,
    detached: process.platform !== "win32",
    windowsHide: true,
  })
  if (!child.pid) throw new Error(`Failed to start ${app.slug}: process has no PID.`)
  const pid = child.pid
  const url = `http://${app.host}:${app.preferredPort}`
  const exitPromise = new Promise<number>((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (code: number | null) => resolve(code ?? 1))
  })
  try {
    await dependencies.waitForHealth({
      url: `${url}${app.healthPath}`,
      expectedAppId: app.appId,
      timeoutMs: 60_000,
      intervalMs: 250,
    })
  } catch (error) {
    await (dependencies.terminate ?? terminateProcessTree)(pid)
    throw error
  }
  dependencies.write(`[factory] Ready: ${url}`)
  return {
    pid,
    url,
    stop: () => (dependencies.terminate ?? terminateProcessTree)(pid),
    waitForExit: () => exitPromise,
  }
}
