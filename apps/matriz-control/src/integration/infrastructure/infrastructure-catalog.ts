import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  infrastructureContractV1Schema,
  validateInfrastructureCatalog,
  type InfrastructureContractV1,
} from "@matriz/integration-infrastructure-contracts"

export interface ControlInfrastructureApp {
  readonly appId: string
  readonly classification: InfrastructureContractV1["classification"]
  readonly runtimeKind: InfrastructureContractV1["runtime"]["kind"]
  readonly port: number | null
  readonly healthPath: string | null
  readonly schema: string | null
  readonly tenancy: InfrastructureContractV1["database"]["tenancy"]
  readonly runtimeRole: string | null
  readonly migrationRole: string | null
  readonly identityRequired: boolean
  readonly oidcClientId: string | null
  readonly cacheRequired: boolean
  readonly cacheNamespaces: readonly string[]
  readonly eventTransport: InfrastructureContractV1["events"]["transport"]
  readonly outbox: boolean
  readonly inbox: boolean
  readonly environmentKeyCount: number
  readonly secretKeyCount: number
  readonly filesystemRequired: boolean
}

export interface ControlInfrastructureInventory {
  readonly apps: readonly ControlInfrastructureApp[]
  readonly issues: readonly string[]
  readonly summary: {
    readonly apps: number
    readonly databaseOwners: number
    readonly identityClients: number
    readonly cacheUsers: number
    readonly eventParticipants: number
  }
}

function presentContract(contract: InfrastructureContractV1): ControlInfrastructureApp {
  return {
    appId: contract.appId,
    classification: contract.classification,
    runtimeKind: contract.runtime.kind,
    port: contract.runtime.port ?? null,
    healthPath: contract.runtime.healthPath ?? null,
    schema: contract.database.schema ?? null,
    tenancy: contract.database.tenancy,
    runtimeRole: contract.database.runtimeRole ?? null,
    migrationRole: contract.database.migrationRole ?? null,
    identityRequired: contract.identity.required,
    oidcClientId: contract.identity.oidcClientId ?? null,
    cacheRequired: contract.cache.required,
    cacheNamespaces: contract.cache.namespaces,
    eventTransport: contract.events.transport,
    outbox: contract.events.outbox,
    inbox: contract.events.inbox,
    environmentKeyCount: contract.environment.keys.length,
    secretKeyCount: contract.environment.keys.filter((key) => key.secret).length,
    filesystemRequired: contract.filesystem.required,
  }
}

export async function loadControlInfrastructureInventory(repositoryRoot: string): Promise<ControlInfrastructureInventory> {
  const entries = (await readdir(path.join(repositoryRoot, "apps"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
  const contracts: InfrastructureContractV1[] = []
  const issues: string[] = []

  for (const entry of entries) {
    const relativeRoot = `apps/${entry.name}`
    try {
      const manifest = await readFile(path.join(repositoryRoot, relativeRoot, "src", "manifest", "manifest.ts"), "utf8")
      const manifestAppId = manifest.match(/\bappId:\s*["']([^"']+)["']/)?.[1]
      if (!manifestAppId) continue
      const candidate = JSON.parse(await readFile(path.join(repositoryRoot, relativeRoot, "infrastructure.json"), "utf8")) as unknown
      const parsed = infrastructureContractV1Schema.safeParse(candidate)
      if (!parsed.success) {
        issues.push(`${relativeRoot}/infrastructure.json is invalid.`)
      } else if (parsed.data.appId !== manifestAppId) {
        issues.push(`${relativeRoot}/infrastructure.json does not match its manifest.`)
      } else {
        contracts.push(parsed.data)
      }
    } catch (error) {
      const manifestExists = await readFile(path.join(repositoryRoot, relativeRoot, "src", "manifest", "manifest.ts"), "utf8").then(() => true).catch(() => false)
      if (manifestExists) issues.push(`${relativeRoot}/infrastructure.json could not be read: ${error instanceof Error ? error.name : "unknown error"}.`)
    }
  }

  const validation = validateInfrastructureCatalog(contracts)
  issues.push(...validation.issues.map((issue) => issue.message))
  const apps = contracts.map(presentContract)
  return {
    apps,
    issues,
    summary: {
      apps: apps.length,
      databaseOwners: apps.filter((app) => app.schema !== null).length,
      identityClients: apps.filter((app) => app.identityRequired).length,
      cacheUsers: apps.filter((app) => app.cacheRequired || app.cacheNamespaces.length > 0).length,
      eventParticipants: apps.filter((app) => app.eventTransport !== "none").length,
    },
  }
}
