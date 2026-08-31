import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { hash as bcryptHash } from "bcryptjs"
import { RetentionPolicy, StorageType, jetstreamManager } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"

const execFileAsync = promisify(execFile)

type Options = Readonly<{
  helperPath: string
  execute?(file: string, args: readonly string[]): Promise<string>
  hash?(password: string): Promise<string>
  provision?(controlPassword: string): Promise<void>
}>

export class WindowsNatsCredentialProvisioner {
  constructor(private readonly options: Options) {}

  async prepare(): Promise<Readonly<{ payPasswordHash: string; controlPasswordHash: string; provisionStreams(): Promise<void> }>> {
    const output = (await (this.options.execute ?? execute)("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.options.helperPath, "-Action", "ProvisionPay",
    ])).trim()
    let credentials: { payPassword?: unknown; controlPassword?: unknown }
    try { credentials = JSON.parse(output) as typeof credentials } catch { throw new Error("NATS credential helper returned an invalid credential") }
    const payPassword = validPassword(credentials.payPassword)
    const controlPassword = validPassword(credentials.controlPassword)
    const hash = this.options.hash ?? ((value: string) => bcryptHash(value, 12))
    const [payPasswordHash, controlPasswordHash] = await Promise.all([hash(payPassword), hash(controlPassword)])
    if (![payPasswordHash, controlPasswordHash].every((value) => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value))) throw new Error("NATS credential verifier is invalid")
    return { payPasswordHash, controlPasswordHash, provisionStreams: () => (this.options.provision ?? provisionPayStream)(controlPassword) }
  }
}

function validPassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 32 || /\s/.test(value)) throw new Error("NATS credential helper returned an invalid credential")
  return value
}

async function provisionPayStream(password: string): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const connection = await connect({ servers: "nats://127.0.0.1:54222", user: "matriz_control", pass: password, name: "matriz-control-provisioner" })
      try {
        const manager = await jetstreamManager(connection)
        const config = { subjects: ["matriz.v1.pay.>"], storage: StorageType.File, retention: RetentionPolicy.Limits, max_age: 30 * 86_400_000_000_000, duplicate_window: 120_000_000_000 }
        try { await manager.streams.info("MATRIZ_PAY"); await manager.streams.update("MATRIZ_PAY", config) }
        catch { await manager.streams.add({ name: "MATRIZ_PAY", ...config }) }
        return
      }
      finally { await connection.drain() }
    }
    catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 250)) }
  }
  throw new Error("Matriz Pay JetStream provisioning failed", { cause: lastError })
}

async function execute(file: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync(file, [...args], { windowsHide: true, timeout: 15_000, maxBuffer: 8 * 1024, encoding: "utf8" })
  return result.stdout
}
