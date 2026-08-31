import type { ControlInfrastructureInventory } from "../../integration/infrastructure/infrastructure-catalog"

export interface InfrastructureInventoryViewModel {
  readonly status: { readonly tone: "healthy" | "danger"; readonly label: string }
  readonly metrics: readonly { readonly label: string; readonly value: string }[]
  readonly issues: readonly string[]
  readonly apps: readonly {
    readonly appId: string
    readonly classification: string
    readonly runtime: string
    readonly database: string
    readonly identity: string
    readonly cache: string
    readonly events: string
    readonly secrets: string
  }[]
}

export function presentInfrastructureInventory(inventory: ControlInfrastructureInventory): InfrastructureInventoryViewModel {
  return {
    status: inventory.issues.length
      ? { tone: "danger", label: `${inventory.issues.length} inconsistência(s)` }
      : { tone: "healthy", label: "Contratos válidos" },
    metrics: [
      { label: "Apps", value: String(inventory.summary.apps) },
      { label: "Schemas", value: `${inventory.summary.databaseOwners} / 8` },
      { label: "OIDC", value: String(inventory.summary.identityClients) },
      { label: "Eventos", value: String(inventory.summary.eventParticipants) },
    ],
    issues: inventory.issues,
    apps: inventory.apps.map((app) => ({
      appId: app.appId,
      classification: app.classification,
      runtime: app.port === null ? app.runtimeKind : `${app.runtimeKind} · 127.0.0.1:${app.port}`,
      database: app.schema === null
        ? "sem PostgreSQL"
        : `${app.schema} · ${app.tenancy} · runtime ${app.runtimeRole} · migration ${app.migrationRole}${app.workerRole ? ` · worker ${app.workerRole}` : ""}`,
      identity: app.identityRequired ? `OIDC · ${app.oidcClientId}` : "não requerido",
      cache: app.cacheRequired ? `obrigatório · ${app.cacheNamespaces.join(", ")}` : app.cacheNamespaces.length ? `opcional · ${app.cacheNamespaces.join(", ")}` : "não requerido",
      events: app.eventTransport === "none" ? "sem transporte" : `JetStream · ${app.outbox ? "outbox" : "—"} / ${app.inbox ? "inbox" : "—"}`,
      secrets: `${app.secretKeyCount} protegidos de ${app.environmentKeyCount} chaves`,
    })),
  }
}
