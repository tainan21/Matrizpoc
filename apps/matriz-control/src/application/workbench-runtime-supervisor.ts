import { EventEmitter } from "node:events"
import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import type { WorkbenchRuntimeSnapshot } from "../domain/workbench-runtime"

export interface WorkbenchProcessHandle extends EventEmitter {
  pid: number | null
  stop(): Promise<void>
}

export interface WorkbenchProcessRuntime {
  start(serverPath: string, environment: Record<string, string | undefined>): WorkbenchProcessHandle
}

interface SupervisorOptions {
  rootDir: string
  serverPath: string
  runtime?: WorkbenchProcessRuntime
  health: (capability: string) => Promise<{ contractVersion: string }>
  wait?: (milliseconds: number) => Promise<void>
  randomSecret?: () => string
}

const now = () => new Date().toISOString()

export function workbenchEnvironment(
  parent: Record<string, string | undefined>,
  sessionSecret: string,
  capabilitySecret: string,
  rootDir: string,
): Record<string, string | undefined> {
  const safe: Record<string, string | undefined> = {}
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"]) {
    if (parent[key] !== undefined) safe[key] = parent[key]
  }
  return {
    ...safe,
    ELECTRON_RUN_AS_NODE: "1",
    HOSTNAME: "127.0.0.1",
    PORT: "3005",
    WORKBENCH_RUNTIME_MODE: "control-desktop",
    WORKBENCH_LOCAL_TOKEN: sessionSecret,
    WORKBENCH_CONTROL_CAPABILITY: capabilitySecret,
    MATRIZ_WORKSPACE_ROOT: rootDir,
  }
}

class NodeWorkbenchProcessRuntime implements WorkbenchProcessRuntime {
  start(serverPath: string, environment: Record<string, string | undefined>): WorkbenchProcessHandle {
    const child = spawn(process.execPath, [serverPath], { env: environment as NodeJS.ProcessEnv, windowsHide: true, stdio: "ignore" })
    const handle = child as unknown as WorkbenchProcessHandle
    handle.stop = async () => {
      if (!child.pid || child.killed) return
      if (process.platform === "win32") {
        await new Promise<void>((resolve) => {
          const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" })
          killer.once("close", () => resolve())
          killer.once("error", () => resolve())
        })
      } else child.kill("SIGTERM")
    }
    return handle
  }
}

export class WorkbenchRuntimeSupervisor {
  private readonly runtime: WorkbenchProcessRuntime
  private readonly wait: (milliseconds: number) => Promise<void>
  private readonly randomSecret: () => string
  private snapshotValue: WorkbenchRuntimeSnapshot = { status: "stopped", pid: null, error: null, updatedAt: now() }
  private handle?: WorkbenchProcessHandle
  private pending?: Promise<WorkbenchRuntimeSnapshot>
  private connectionValue?: { url: "http://127.0.0.1:3005"; sessionSecret: string; capability: string }

  constructor(private readonly options: SupervisorOptions) {
    this.runtime = options.runtime ?? new NodeWorkbenchProcessRuntime()
    this.wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
    this.randomSecret = options.randomSecret ?? (() => randomBytes(32).toString("hex"))
  }

  snapshot() { return structuredClone(this.snapshotValue) }

  connection() {
    if (!this.connectionValue) throw new Error("Workbench runtime is not started")
    return { ...this.connectionValue }
  }

  async start(): Promise<WorkbenchRuntimeSnapshot> {
    if (this.snapshotValue.status === "ready" || this.snapshotValue.status === "incompatible") return this.snapshot()
    if (this.pending) return this.pending
    this.pending = this.startOnce().finally(() => { this.pending = undefined })
    return this.pending
  }

  private async startOnce(): Promise<WorkbenchRuntimeSnapshot> {
    const sessionSecret = this.randomSecret()
    const candidate = this.randomSecret()
    const capability = candidate === sessionSecret ? randomBytes(32).toString("hex") : candidate
    this.connectionValue = { url: "http://127.0.0.1:3005", sessionSecret, capability }
    this.handle = this.runtime.start(
      this.options.serverPath,
      workbenchEnvironment(process.env, sessionSecret, capability, this.options.rootDir),
    )
    this.snapshotValue = { status: "starting", pid: this.handle.pid, error: null, updatedAt: now() }
    this.handle.once("exit", () => {
      this.connectionValue = undefined
      if (this.snapshotValue.status !== "incompatible") {
        this.snapshotValue = { status: "failed", pid: null, error: "Workbench process exited", updatedAt: now() }
      }
    })
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const health = await this.options.health(capability)
        const status = health.contractVersion === "workbench-control-v1" ? "ready" : "incompatible"
        this.snapshotValue = { status, pid: this.handle.pid, error: status === "incompatible" ? "Workbench runtime is incompatible" : null, updatedAt: now() }
        return this.snapshot()
      } catch (error) {
        if (attempt === 99) {
          this.snapshotValue = { status: "failed", pid: this.handle.pid, error: error instanceof Error ? error.message : "Workbench did not become ready", updatedAt: now() }
          return this.snapshot()
        }
        await this.wait(100)
      }
    }
    return this.snapshot()
  }

  async stop(): Promise<WorkbenchRuntimeSnapshot> {
    await this.handle?.stop()
    this.handle = undefined
    this.connectionValue = undefined
    this.snapshotValue = { status: "stopped", pid: null, error: null, updatedAt: now() }
    return this.snapshot()
  }

  async restart(): Promise<WorkbenchRuntimeSnapshot> {
    await this.stop()
    return this.start()
  }
}
