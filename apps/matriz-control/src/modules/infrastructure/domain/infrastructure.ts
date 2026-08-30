export type InfrastructureServiceId = "postgres" | "garnet" | "nats"
export type InfrastructureTargetId = InfrastructureServiceId | "stack"
export type InfrastructureActionId = "install" | "start" | "stop" | "restart"
export type InfrastructureServiceState = "not_installed" | "installing" | "stopped" | "starting" | "healthy" | "degraded" | "drifted" | "failed" | "external_unowned"

export interface InfrastructureServiceSnapshot {
  readonly id: InfrastructureServiceId
  readonly displayName: string
  readonly serviceName: string
  readonly state: InfrastructureServiceState
  readonly host: "127.0.0.1"
  readonly ports: readonly number[]
  readonly version: string
  readonly message: string
}

export interface InfrastructureSnapshot {
  readonly desktop: true
  readonly root: string
  readonly services: readonly InfrastructureServiceSnapshot[]
  readonly observedAt: string
}

export interface InfrastructureActionPreview {
  readonly confirmationToken: string
  readonly serviceId: InfrastructureTargetId
  readonly actionId: InfrastructureActionId
  readonly title: string
  readonly impact: readonly string[]
  readonly expiresAt: number
}
