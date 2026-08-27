import { EventEmitter } from "node:events"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import type { ResolvedTerminalAction, TerminalSession } from "../domain/terminal"
import type { ControlDiagnosticInput } from "./control-diagnostic-mapper"
import { resolveTerminalAction, terminalRoute } from "../integration/projects/project-catalog"
import { toControlDiagnostic } from "./control-diagnostic-mapper"

export interface ProcessHandle extends EventEmitter { pid: number | null; write(input: string): void; stop(): Promise<void> }
export interface ProcessRuntime { start(action: ResolvedTerminalAction): ProcessHandle }

export function resolveSpawnSpec(action: ResolvedTerminalAction, platform: NodeJS.Platform = process.platform, commandProcessor = process.env.ComSpec ?? "cmd.exe") {
  if (platform === "win32" && action.command === "corepack") {
    return { command: commandProcessor, args: ["/d", "/s", "/c", [action.command, ...action.args].join(" ")] }
  }
  return { command: action.command, args: action.args }
}

export function terminalEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const { MATRIZ_CONTROL_LOCAL_TOKEN: _token, MATRIZ_CONTROL_COOKIE_SECURE: _cookieSetting, ...safeEnvironment } = environment
  return safeEnvironment
}

class NodeProcessRuntime implements ProcessRuntime {
  start(action: ResolvedTerminalAction): ProcessHandle {
    const spec = resolveSpawnSpec(action)
    const child = spawn(spec.command, spec.args, { cwd: action.cwd, env: terminalEnvironment(), windowsHide: true, shell: false })
    const handle = new EventEmitter() as ProcessHandle
    handle.pid = child.pid ?? null
    handle.write = (input) => child.stdin?.writable && child.stdin.write(input)
    handle.stop = async () => {
      if (!child.pid || child.killed) return
      if (process.platform === "win32") {
        await new Promise<void>((done) => { const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true }); killer.once("close", () => done()); killer.once("error", () => done()) })
      } else child.kill("SIGTERM")
    }
    child.stdout?.on("data", (chunk) => handle.emit("output", String(chunk)))
    child.stderr?.on("data", (chunk) => handle.emit("output", String(chunk)))
    child.once("spawn", () => handle.emit("running"))
    child.once("error", (error) => handle.emit("error", error))
    child.once("close", (code) => handle.emit("exit", code ?? -1))
    return handle
  }
}

interface SupervisorOptions { rootDir: string; runtime?: ProcessRuntime; maxLines?: number; resolveAction?: (rootDir: string, projectId: string, actionId: string) => Promise<ResolvedTerminalAction>; onEligibleFailure?: (diagnostic: ControlDiagnosticInput) => Promise<void> }
interface ManagedSession { snapshot: TerminalSession; handle: ProcessHandle; partial: string; currentDirectory: string }
const redact = (line: string) => line
  .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
  .replace(/((?:token|secret|password|api[_-]?key)\s*[=:]\s*)\S+/gi, "$1[redacted]")

export class TerminalSupervisor {
  private readonly sessions = new Map<string, ManagedSession>()
  private readonly exitWaiters = new Map<string, Set<(session: TerminalSession) => void>>()
  private readonly runtime: ProcessRuntime
  private readonly maxLines: number
  private readonly resolver: NonNullable<SupervisorOptions["resolveAction"]>
  constructor(private readonly options: SupervisorOptions) { this.runtime = options.runtime ?? new NodeProcessRuntime(); this.maxLines = options.maxLines ?? 400; this.resolver = options.resolveAction ?? resolveTerminalAction }

  list() { return [...this.sessions.values()].map(({ snapshot }) => structuredClone(snapshot)) }
  get(id: string) { const item = this.sessions.get(id); return item ? structuredClone(item.snapshot) : undefined }

  async start(projectId: string, actionId: string) {
    const active = [...this.sessions.values()].find(({ snapshot }) => snapshot.projectId === projectId && snapshot.actionId === actionId && ["starting", "running"].includes(snapshot.status))
    if (active) return structuredClone(active.snapshot)
    if (this.sessions.size >= 8) throw new Error("Session limit reached")
    const action = await this.resolver(this.options.rootDir, projectId, actionId)
    const id = `term_${randomUUID()}`
    const handle = this.runtime.start(action)
    const managed: ManagedSession = { handle, partial: "", currentDirectory: action.cwd, snapshot: { id, projectId, projectName: action.projectName, actionId: action.actionId, label: action.label, route: terminalRoute(this.options.rootDir, action.cwd), port: action.port ?? null, status: "starting", pid: handle.pid, lines: [], startedAt: new Date().toISOString(), exitCode: null, error: null } }
    this.sessions.set(id, managed)
    handle.on("running", () => { managed.snapshot.status = "running" })
    handle.on("output", (chunk: string) => this.append(managed, chunk))
    handle.on("exit", (code: number) => { managed.snapshot.status = "exited"; managed.snapshot.exitCode = code; if (managed.partial) this.append(managed, "\n"); this.deliverFailure(managed.snapshot); this.resolveExitWaiters(managed.snapshot) })
    handle.on("error", (error: Error) => { managed.snapshot.status = "failed"; managed.snapshot.exitCode = -1; managed.snapshot.error = error.message; this.deliverFailure(managed.snapshot); this.resolveExitWaiters(managed.snapshot) })
    queueMicrotask(() => { if (managed.snapshot.status === "starting") managed.snapshot.status = "running" })
    return structuredClone(managed.snapshot)
  }

  private append(managed: ManagedSession, chunk: string) {
    const parts = `${managed.partial}${chunk}`.split(/\r?\n/)
    managed.partial = parts.pop() ?? ""
    managed.snapshot.lines.push(...parts.map(redact))
    if (managed.snapshot.lines.length > this.maxLines) managed.snapshot.lines.splice(0, managed.snapshot.lines.length - this.maxLines)
  }

  private deliverFailure(session: TerminalSession) {
    const diagnostic = toControlDiagnostic(session)
    if (!diagnostic || !this.options.onEligibleFailure) return
    void this.options.onEligibleFailure(diagnostic).catch(() => undefined)
  }

  private resolveExitWaiters(session: TerminalSession) {
    const waiters = this.exitWaiters.get(session.id)
    if (!waiters) return
    const snapshot = structuredClone(session)
    for (const resolve of waiters) resolve(snapshot)
    this.exitWaiters.delete(session.id)
  }

  waitForExit(id: string): Promise<TerminalSession> {
    const session = this.sessions.get(id)?.snapshot
    if (!session) return Promise.reject(new Error("Unknown session"))
    if (["exited", "failed"].includes(session.status)) return Promise.resolve(structuredClone(session))
    return new Promise((resolve) => {
      const waiters = this.exitWaiters.get(id) ?? new Set()
      waiters.add(resolve)
      this.exitWaiters.set(id, waiters)
    })
  }

  write(id: string, input: string) { const item = this.sessions.get(id); if (!item) throw new Error("Unknown session"); if (input.length > 4096) throw new Error("Input too large"); if (input.trim().toLowerCase() === "cd mih") { item.currentDirectory = this.options.rootDir; item.snapshot.route = terminalRoute(this.options.rootDir, item.currentDirectory); return } item.handle.write(input) }
  async stop(id: string) { const item = this.sessions.get(id); if (!item) throw new Error("Unknown session"); item.snapshot.status = "stopping"; await item.handle.stop() }
  async restart(id: string) { const item = this.sessions.get(id); if (!item) throw new Error("Unknown session"); if (["starting", "running", "stopping"].includes(item.snapshot.status)) await this.stop(id); this.sessions.delete(id); return this.start(item.snapshot.projectId, item.snapshot.actionId) }
  close(id: string) { const item = this.sessions.get(id); if (!item) return; if (["starting", "running", "stopping"].includes(item.snapshot.status)) throw new Error("Stop active session before closing"); this.sessions.delete(id) }
}

const globalKey = Symbol.for("matriz.control.terminal-supervisor")
export function getTerminalSupervisor() {
  const scope = globalThis as typeof globalThis & { [globalKey]?: TerminalSupervisor }
  return scope[globalKey] ??= new TerminalSupervisor({ rootDir: resolve(process.cwd(), "../..") })
}
