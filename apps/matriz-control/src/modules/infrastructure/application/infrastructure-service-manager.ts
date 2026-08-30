import { isAbsolute, normalize, relative, resolve } from "node:path"
import type { InfrastructureActionId, InfrastructureActionPreview, InfrastructureServiceId, InfrastructureSnapshot, InfrastructureTargetId } from "../domain/infrastructure"
import { MATRIZ_SERVICE_CATALOG, type MatrizServiceDefinition } from "../domain/service-catalog"

export interface NativeServiceInspection {
  readonly exists: boolean
  readonly running: boolean
  readonly imagePath: string | null
  readonly startMode: string | null
  readonly nativeState?: "running" | "stopped" | "start_pending" | "stop_pending" | "unknown"
  readonly healthy?: boolean | null
}

export interface InfrastructureHost {
  inspect(service: MatrizServiceDefinition): Promise<NativeServiceInspection>
  execute(service: MatrizServiceDefinition | null, action: InfrastructureActionId): Promise<void>
  readLogs(service: MatrizServiceDefinition): Promise<readonly string[]>
}

interface PendingConfirmation { readonly target: InfrastructureTargetId; readonly action: InfrastructureActionId; readonly expiresAt: number }

export class InfrastructureServiceManager {
  private readonly managedRoot: string
  private readonly pending = new Map<string, PendingConfirmation>()

  constructor(private readonly deps: { host: InfrastructureHost; programData: string; now(): number; token(): string }) {
    this.managedRoot = resolve(deps.programData, "Matriz", "Infrastructure")
  }

  async status(): Promise<InfrastructureSnapshot> {
    return {
      desktop: true,
      root: this.managedRoot,
      observedAt: new Date(this.deps.now()).toISOString(),
      services: await Promise.all(MATRIZ_SERVICE_CATALOG.map(async (service) => {
        const inspection = await this.deps.host.inspect(service)
        const owned = inspection.exists && inspection.imagePath !== null && ownsImagePath(this.managedRoot, inspection.imagePath)
        const state = !inspection.exists ? "not_installed" as const
          : !owned ? "external_unowned" as const
          : inspection.startMode !== "delayed-auto" ? "drifted" as const
          : inspection.nativeState === "start_pending" ? "starting" as const
          : inspection.running && inspection.healthy === false ? "degraded" as const
          : inspection.running ? "healthy" as const : "stopped" as const
        return { id: service.id, displayName: service.displayName, serviceName: service.serviceName, state, host: service.host, ports: service.ports, version: service.version, message: stateMessage(state) }
      })),
    }
  }

  async preview(target: InfrastructureTargetId, action: InfrastructureActionId): Promise<InfrastructureActionPreview> {
    assertAction(target, action)
    if (target !== "stack") {
      const snapshot = (await this.status()).services.find((service) => service.id === target)
      if (!snapshot) throw new Error("Unknown infrastructure service")
      if (snapshot.state === "external_unowned") throw new Error("Service is not owned by Matriz Control")
      if (action !== "install" && snapshot.state === "not_installed") throw new Error("Service is not installed")
    }
    const confirmationToken = this.deps.token()
    const expiresAt = this.deps.now() + 30_000
    this.pending.set(confirmationToken, { target, action, expiresAt })
    return { confirmationToken, serviceId: target, actionId: action, title: `${actionLabel(action)} ${targetLabel(target)}`, impact: impact(target, action), expiresAt }
  }

  async confirm(token: string): Promise<InfrastructureSnapshot> {
    const pending = this.pending.get(token)
    if (!pending) throw new Error("Confirmation token is invalid or already used")
    this.pending.delete(token)
    if (this.deps.now() > pending.expiresAt) throw new Error("Confirmation token expired")
    if (pending.target === "stack" && pending.action === "install") await this.deps.host.execute(null, pending.action)
    else if (pending.target === "stack") {
      const snapshot = await this.status()
      if (snapshot.services.some((service) => service.state === "external_unowned")) throw new Error("Stack contains an external unowned service; operation refused")
      for (const definition of MATRIZ_SERVICE_CATALOG) {
        const state = snapshot.services.find((service) => service.id === definition.id)?.state
        if (state !== "not_installed") await this.deps.host.execute(definition, pending.action)
      }
    }
    else {
      const definition = MATRIZ_SERVICE_CATALOG.find((service) => service.id === pending.target)
      if (!definition) throw new Error("Unknown infrastructure service")
      const current = (await this.status()).services.find((service) => service.id === pending.target)
      if (current?.state === "external_unowned") throw new Error("Service ownership changed; operation refused")
      await this.deps.host.execute(definition, pending.action)
    }
    return this.status()
  }

  async logs(serviceId: InfrastructureServiceId): Promise<readonly string[]> {
    const definition = MATRIZ_SERVICE_CATALOG.find((service) => service.id === serviceId)
    if (!definition) throw new Error("Unknown infrastructure service")
    return (await this.deps.host.readLogs(definition)).slice(-200).map(redact)
  }
}

function ownsImagePath(root: string, candidate: string): boolean {
  const normalizedRoot = normalize(root).toLocaleLowerCase()
  const normalizedCandidate = normalize(candidate).toLocaleLowerCase()
  if (normalizedCandidate.includes(normalizedRoot)) return true
  if (!isAbsolute(candidate)) return false
  const child = relative(normalizedRoot, normalizedCandidate)
  return child !== "" && !child.startsWith("..") && !isAbsolute(child)
}

function assertAction(target: InfrastructureTargetId, action: InfrastructureActionId) {
  if (action === "install" && target !== "stack") throw new Error("Install is available only for the managed stack")
}

function redact(line: string): string {
  return line
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/\b(password|secret|token|authorization)=([^\s&]+)/gi, "$1=[REDACTED]")
    .slice(0, 2_000)
}

function stateMessage(state: string) { return ({ not_installed: "Não instalado", stopped: "Parado", healthy: "Saudável", drifted: "Configuração divergente", external_unowned: "Serviço externo — somente leitura" } as Record<string, string>)[state] ?? state }
function actionLabel(action: InfrastructureActionId) { return ({ install: "Instalar", start: "Iniciar", stop: "Parar", restart: "Reiniciar" } as const)[action] }
function targetLabel(target: InfrastructureTargetId) { return target === "stack" ? "stack Matriz" : MATRIZ_SERVICE_CATALOG.find((item) => item.id === target)?.displayName ?? target }
function impact(target: InfrastructureTargetId, action: InfrastructureActionId): readonly string[] { return [`Alvo fixo: ${targetLabel(target)}`, `Ação: ${actionLabel(action)}`, "PostgreSQL externo em 5432 permanece fora do escopo"] }
