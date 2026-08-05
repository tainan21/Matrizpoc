import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { EventEmitter } from "node:events"
import { stat } from "node:fs/promises"
import path from "node:path"
import readline from "node:readline"

type RequestId = string | number

interface RpcResponse {
  id: RequestId
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

const CODEX_ENV_ALLOWLIST = [
  "APPDATA",
  "CODEX_HOME",
  "COMSPEC",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "NO_COLOR",
  "NODE_ENV",
  "PATH",
  "PATHEXT",
  "PROGRAMDATA",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "USERDOMAIN",
  "USERNAME",
  "USERPROFILE",
  "WINDIR",
] as const

export function buildCodexChildEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const entries = new Map(
    Object.entries(source).map(([key, value]) => [key.toUpperCase(), [key, value] as const]),
  )
  return Object.fromEntries(
    CODEX_ENV_ALLOWLIST.flatMap((key) => {
      const entry = entries.get(key)
      return entry?.[1] === undefined ? [] : [[entry[0], entry[1]]]
    }),
  ) as NodeJS.ProcessEnv
}

export interface RpcNotification {
  method: string
  params?: Record<string, unknown>
}

export interface RpcServerRequest extends RpcNotification {
  id: RequestId
}

export interface CodexRuntimeInfo {
  available: boolean
  executable?: string
  source?: "environment" | "plugin" | "desktop" | "path"
  reason?: string
}

async function isFile(candidate: string): Promise<boolean> {
  return stat(candidate).then((value) => value.isFile()).catch(() => false)
}

export async function resolveCodexRuntime(): Promise<CodexRuntimeInfo> {
  const configured = process.env.WORKBENCH_CODEX_BIN?.trim()
  if (configured) {
    if (!path.isAbsolute(configured)) {
      return {
        available: false,
        reason: "WORKBENCH_CODEX_BIN precisa ser um caminho absoluto.",
      }
    }
    if (!(await isFile(configured))) {
      return {
        available: false,
        reason: "WORKBENCH_CODEX_BIN não aponta para um arquivo existente.",
      }
    }
    return { available: true, executable: configured, source: "environment" }
  }

  if (process.platform === "win32") {
    const userProfile = process.env.USERPROFILE
    if (userProfile) {
      const pluginRuntime = path.join(
        userProfile,
        ".codex",
        "plugins",
        ".plugin-appserver",
        "codex.exe",
      )
      if (await isFile(pluginRuntime)) {
        return { available: true, executable: pluginRuntime, source: "plugin" }
      }
    }
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      const desktopRuntime = path.join(localAppData, "OpenAI", "Codex", "bin", "codex.exe")
      if (await isFile(desktopRuntime)) {
        return { available: true, executable: desktopRuntime, source: "desktop" }
      }
    }
  }

  return {
    available: true,
    executable: process.platform === "win32" ? "codex.cmd" : "codex",
    source: "path",
  }
}

export class CodexAppServerClient extends EventEmitter {
  private process?: ChildProcessWithoutNullStreams
  private sequence = 0
  private readonly pending = new Map<
    RequestId,
    {
      resolve: (value: unknown) => void
      reject: (reason: Error) => void
      timeout: NodeJS.Timeout
    }
  >()

  constructor(
    private readonly executable: string,
    private readonly cwd: string,
    private readonly args = ["app-server", "--listen", "stdio://"],
  ) {
    super()
  }

  async connect(): Promise<void> {
    if (this.process) return
    const child = spawn(this.executable, this.args, {
      cwd: this.cwd,
      env: buildCodexChildEnvironment(),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    })
    this.process = child
    const output = readline.createInterface({ input: child.stdout })
    output.on("line", (line) => this.receive(line))
    child.stderr.on("data", (chunk: Buffer) => {
      this.emit("stderr", chunk.toString("utf8"))
    })
    child.once("error", (error) => this.fail(error))
    child.once("exit", (code, signal) => {
      this.fail(new Error(`Codex App Server encerrou (${code ?? signal ?? "desconhecido"}).`))
      this.emit("exit", { code, signal })
    })

    await this.request("initialize", {
      clientInfo: {
        name: "matriz_workbench",
        title: "Matriz Workbench",
        version: "0.1.0",
      },
      capabilities: {
        optOutNotificationMethods: ["item/reasoning/textDelta"],
      },
    })
    this.notify("initialized", {})
  }

  async request<T = unknown>(
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 30_000,
  ): Promise<T> {
    const id = ++this.sequence
    const response = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Timeout no método Codex ${method}.`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      })
    })
    this.send({ method, id, params })
    return response
  }

  notify(method: string, params: Record<string, unknown>): void {
    this.send({ method, params })
  }

  respond(id: RequestId, result: unknown): void {
    this.send({ id, result })
  }

  respondError(id: RequestId, code: number, message: string): void {
    this.send({ id, error: { code, message } })
  }

  close(): void {
    this.process?.kill()
    this.process = undefined
  }

  private send(message: unknown): void {
    if (!this.process?.stdin.writable) {
      throw new Error("Codex App Server não está conectado.")
    }
    this.process.stdin.write(`${JSON.stringify(message)}\n`)
  }

  private receive(line: string): void {
    let message: RpcResponse | RpcNotification | RpcServerRequest
    try {
      message = JSON.parse(line) as RpcResponse | RpcNotification | RpcServerRequest
    } catch {
      this.emit("protocolError", new Error("Mensagem JSON inválida recebida do Codex."))
      return
    }
    if ("id" in message && !("method" in message)) {
      const pending = this.pending.get(message.id)
      if (!pending) return
      clearTimeout(pending.timeout)
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
      return
    }
    if ("method" in message && "id" in message) {
      this.emit("serverRequest", message as RpcServerRequest)
      return
    }
    if ("method" in message) {
      this.emit("notification", message as RpcNotification)
    }
  }

  private fail(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
  }
}
