import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { createConnection } from "node:net"
import { promisify } from "node:util"
import type { InfrastructureActionId } from "../src/modules/infrastructure/domain/infrastructure"
import type { MatrizServiceDefinition } from "../src/modules/infrastructure/domain/service-catalog"
import type { InfrastructureHost, NativeServiceInspection } from "../src/modules/infrastructure/application/infrastructure-service-manager"

const execFileAsync = promisify(execFile)

export class WindowsInfrastructureHost implements InfrastructureHost {
  private readonly root: string

  constructor(private readonly options: { programData: string; helperPath: string; natsCredentials: { prepare(): Promise<Readonly<{ payPasswordHash: string; seumeiPasswordHash: string; hubPasswordHash: string; controlPasswordHash: string; provisionStreams(): Promise<void> }>> } }) {
    if (process.platform !== "win32") throw new Error("Matriz infrastructure services require Windows")
    this.root = resolve(options.programData, "Matriz", "Infrastructure")
  }

  async inspect(service: MatrizServiceDefinition): Promise<NativeServiceInspection> {
    const script = "$s=Get-CimInstance Win32_Service -Filter \"Name='$env:MATRIZ_SERVICE_NAME'\" -ErrorAction SilentlyContinue;if($null -eq $s){'null'}else{$d=(Get-ItemProperty -LiteralPath ('HKLM:\\SYSTEM\\CurrentControlSet\\Services\\'+$env:MATRIZ_SERVICE_NAME) -Name DelayedAutoStart -ErrorAction SilentlyContinue).DelayedAutoStart;@{exists=$true;running=($s.State -eq 'Running');nativeState=($s.State -replace ' ','_').ToLowerInvariant();imagePath=$s.PathName;startMode=if($s.StartMode -eq 'Auto' -and $d -eq 1){'delayed-auto'}else{$s.StartMode.ToLowerInvariant()}}|ConvertTo-Json -Compress}"
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, env: { ...process.env, MATRIZ_SERVICE_NAME: service.serviceName }, maxBuffer: 64 * 1024 })
    const text = stdout.trim()
    if (!text || text === "null") return { exists: false, running: false, imagePath: null, startMode: null }
    const value = JSON.parse(text) as { exists?: boolean; running?: boolean; nativeState?: NativeServiceInspection["nativeState"]; imagePath?: string; startMode?: string }
    const running = value.running === true
    const healthy = running ? (await Promise.all(service.ports.map((port) => probeLoopback(port)))).every(Boolean) : null
    return { exists: value.exists === true, running, nativeState: value.nativeState ?? "unknown", healthy, imagePath: value.imagePath ?? null, startMode: value.startMode ?? null }
  }

  async execute(service: MatrizServiceDefinition | null, action: InfrastructureActionId): Promise<void> {
    if (action === "install") {
      if (service) throw new Error("Individual service installation is not supported")
      await this.installStack()
      return
    }
    const services = service ? [service] : []
    if (!services.length) throw new Error("Stack lifecycle requires an installed-service snapshot")
    for (const definition of services) await this.control(definition.serviceName, action)
  }

  async readLogs(service: MatrizServiceDefinition): Promise<readonly string[]> {
    const candidates = [join(this.root, service.id, "logs", "service.log"), join(this.root, "logs", `${service.serviceName}.log`)]
    for (const candidate of candidates) {
      try { return (await readFile(candidate, "utf8")).split(/\r?\n/).filter(Boolean).slice(-200) } catch { /* try the next fixed location */ }
    }
    return ["Nenhum log local disponível para este serviço."]
  }

  private async control(serviceName: string, action: Exclude<InfrastructureActionId, "install">) {
    if (action === "restart") {
      await this.runSc(["stop", serviceName]).catch(() => undefined)
      await this.runSc(["start", serviceName])
      return
    }
    await this.runSc([action, serviceName])
  }

  private async runSc(args: readonly string[]) {
    await execFileAsync("sc.exe", [...args], { windowsHide: true, maxBuffer: 64 * 1024 })
  }

  private async installStack() {
    const credentials = await this.options.natsCredentials.prepare()
    const launcher = "$p=Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$env:MATRIZ_HELPER,'-Action','Install','-ProgramDataRoot',$env:MATRIZ_PROGRAM_DATA,'-PayNatsPasswordHash',$env:MATRIZ_NATS_PAY_HASH,'-SeumeiNatsPasswordHash',$env:MATRIZ_NATS_SEUMEI_HASH,'-HubNatsPasswordHash',$env:MATRIZ_NATS_HUB_HASH,'-ControlNatsPasswordHash',$env:MATRIZ_NATS_CONTROL_HASH);exit $p.ExitCode"
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", launcher], {
      windowsHide: true,
      env: { ...process.env, MATRIZ_HELPER: this.options.helperPath, MATRIZ_PROGRAM_DATA: this.options.programData, MATRIZ_NATS_PAY_HASH: credentials.payPasswordHash, MATRIZ_NATS_SEUMEI_HASH: credentials.seumeiPasswordHash, MATRIZ_NATS_HUB_HASH: credentials.hubPasswordHash, MATRIZ_NATS_CONTROL_HASH: credentials.controlPasswordHash },
      maxBuffer: 128 * 1024,
    })
    await credentials.provisionStreams()
  }
}

async function probeLoopback(port: number): Promise<boolean> {
  return new Promise((resolveProbe) => {
    const socket = createConnection({ host: "127.0.0.1", port })
    let settled = false
    const finish = (result: boolean) => { if (settled) return; settled = true; socket.destroy(); resolveProbe(result) }
    socket.setTimeout(750)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
  })
}
