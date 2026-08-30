import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  infrastructureContractV1Schema,
  validateInfrastructureCatalog,
  type InfrastructureContractV1,
} from "../../packages/integration/infrastructure-contracts/src/index"

export interface LoadedInfrastructureCatalog {
  readonly contracts: readonly InfrastructureContractV1[]
  readonly issues: readonly string[]
}

const SCHEMA_OWNERS = {
  core: "matriz-identity",
  hub: "matriz-hub",
  spot: "spot",
  seumei: "seumei",
  contracts: "contracts",
  willdash: "willdash",
  ops: "matriz-ops",
  pay: "matriz-pay",
} as const

export function validateInfrastructureBaseline(contracts: readonly InfrastructureContractV1[]): readonly string[] {
  const issues: string[] = []
  for (const [schema, owner] of Object.entries(SCHEMA_OWNERS)) {
    const contract = contracts.find((candidate) => candidate.database.schema === schema)
    if (!contract || contract.appId !== owner) issues.push(`Schema "${schema}" must be owned by "${owner}".`)
  }
  const unknownSchemas = contracts.flatMap((contract) => contract.database.schema ?? []).filter((schema) => !(schema in SCHEMA_OWNERS))
  if (unknownSchemas.length) issues.push(`Unknown database schemas: ${unknownSchemas.join(", ")}.`)
  return issues
}

export async function loadInfrastructureCatalog(repositoryRoot: string): Promise<LoadedInfrastructureCatalog> {
  const appsRoot = path.join(repositoryRoot, "apps")
  const entries = (await readdir(appsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
  const contracts: InfrastructureContractV1[] = []
  const issues: string[] = []

  for (const entry of entries) {
    const appRoot = path.join(appsRoot, entry.name)
    const manifestPath = path.join(appRoot, "src", "manifest", "manifest.ts")
    let manifestSource: string
    try {
      manifestSource = await readFile(manifestPath, "utf8")
    } catch {
      continue
    }

    const manifestAppId = manifestSource.match(/\bappId:\s*["']([^"']+)["']/)?.[1]
    if (!manifestAppId) {
      issues.push(`apps/${entry.name} manifest does not declare a literal appId.`)
      continue
    }

    const relativeContractPath = `apps/${entry.name}/infrastructure.json`
    try {
      const raw = JSON.parse(await readFile(path.join(appRoot, "infrastructure.json"), "utf8")) as unknown
      const parsed = infrastructureContractV1Schema.safeParse(raw)
      if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        issues.push(`${relativeContractPath} is invalid: ${details}`)
        continue
      }
      if (parsed.data.appId !== manifestAppId) {
        issues.push(`${relativeContractPath} appId must match manifest appId "${manifestAppId}".`)
        continue
      }
      contracts.push(parsed.data)
    } catch (error) {
      issues.push(`${relativeContractPath} could not be loaded: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const catalogValidation = validateInfrastructureCatalog(contracts)
  issues.push(...catalogValidation.issues.map((issue) => issue.message))
  issues.push(...validateInfrastructureBaseline(contracts))
  return { contracts, issues }
}
