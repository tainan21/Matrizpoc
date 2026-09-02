import { randomUUID } from "node:crypto"

export interface TerminalProcess {
  readonly pid: number
  write(input: string): void
  kill(): void
  onOutput(listener: (output: string) => void): void
  onExit(listener: (code: number | null) => void): void
}

export interface TerminalSessionSnapshot {
  readonly id: string
  readonly pid: number
  readonly status: "running" | "exited"
  readonly lines: readonly string[]
  readonly exitCode: number | null
}

interface ManagedTerminal {
  readonly process: TerminalProcess
  readonly snapshot: { id: string; pid: number; status: "running" | "exited"; lines: string[]; exitCode: number | null }
  partial: string
}

export class TerminalHost {
  private readonly sessions = new Map<string, ManagedTerminal>()
  private readonly maxLines: number
  private readonly maxSessions: number
  private listener: (sessions: readonly TerminalSessionSnapshot[]) => void = () => undefined

  constructor(private readonly spawn: () => TerminalProcess, options: { maxLines?: number; maxSessions?: number } = {}) {
    this.maxLines = options.maxLines ?? 400
    this.maxSessions = options.maxSessions ?? 4
  }

  subscribe(listener: (sessions: readonly TerminalSessionSnapshot[]) => void) { this.listener = listener }

  list(): readonly TerminalSessionSnapshot[] {
    return [...this.sessions.values()].map(({ snapshot }) => structuredClone(snapshot))
  }

  create(): TerminalSessionSnapshot {
    if (this.sessions.size >= this.maxSessions) throw new Error(`Limite de ${this.maxSessions} sessões atingido`)
    const process = this.spawn()
    const snapshot: ManagedTerminal["snapshot"] = { id: randomUUID(), pid: process.pid, status: "running", lines: [], exitCode: null }
    const managed: ManagedTerminal = { process, snapshot, partial: "" }
    this.sessions.set(snapshot.id, managed)
    process.onOutput((output) => this.append(managed, output))
    process.onExit((code) => { snapshot.status = "exited"; snapshot.exitCode = code; this.emit() })
    this.emit()
    return structuredClone(snapshot)
  }

  write(id: string, input: string) {
    const managed = this.sessions.get(id)
    if (!managed || managed.snapshot.status !== "running") throw new Error("Sessão indisponível")
    if (!input || input.length > 4_096) throw new Error("Entrada muito grande")
    managed.process.write(input)
  }

  interrupt(id: string) {
    const managed = this.sessions.get(id)
    if (!managed || managed.snapshot.status !== "running") throw new Error("Sessão indisponível")
    managed.process.kill()
  }

  close(id: string) {
    const managed = this.sessions.get(id)
    if (!managed) throw new Error("Sessão desconhecida")
    if (managed.snapshot.status === "running") managed.process.kill()
    this.sessions.delete(id)
    this.emit()
  }

  closeAll() {
    for (const managed of this.sessions.values()) if (managed.snapshot.status === "running") managed.process.kill()
    this.sessions.clear()
    this.emit()
  }

  private append(managed: ManagedTerminal, output: string) {
    const normalized = `${managed.partial}${output}`.replaceAll("\r\n", "\n").replaceAll("\r", "\n")
    const lines = normalized.split("\n")
    managed.partial = lines.pop() ?? ""
    managed.snapshot.lines.push(...lines)
    if (managed.partial) managed.snapshot.lines.push(managed.partial)
    managed.snapshot.lines = managed.snapshot.lines.slice(-this.maxLines)
    this.emit()
    if (managed.partial) managed.snapshot.lines.pop()
  }

  private emit() { this.listener(this.list()) }
}

export function terminalEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter(([name]) => !/(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|CERTIFICATE)/i.test(name)))
}
