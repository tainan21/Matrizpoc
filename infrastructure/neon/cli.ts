import {
  buildProvisioningSql,
  buildTopologyPlan,
  buildVerificationSql,
  parseTopologyMode,
  redactSensitiveText,
  validateDatabaseUrl,
  validateTopologyEnvironment,
} from "./topology"
import { reconcileCiPhase, reconcilePrimaryPhase } from "./provider"
import { executeTopologySql } from "./database"

function safeWrite(message: string): void {
  process.stdout.write(`${redactSensitiveText(message)}\n`)
}

async function main(): Promise<void> {
  const mode = parseTopologyMode(process.argv.slice(2))
  const plan = buildTopologyPlan()

  if (mode === "dry-run") {
    safeWrite(`DRY-RUN Neon project database=${plan.project.database} ciBranch=${plan.ciBranch.name}`)
    safeWrite("DRY-RUN phase=1 primary: API database+endpoint, URL identity, apply SQL, read-only verify SQL")
    safeWrite("DRY-RUN phase=2 CI: create/reconcile branch after phase 1, database+endpoint, separate URL identity, apply SQL, read-only verify SQL")
    for (const schema of plan.schemas) {
      safeWrite(
        `DRY-RUN schema=${schema.name} migrationRole=${schema.migrationRole} runtimeRole=${schema.runtimeRole}`,
      )
    }
    return
  }

  const environment = validateTopologyEnvironment(process.env)
  if (!environment.ok) {
    throw new Error(`Missing required environment: ${environment.missing.join(", ")}`)
  }

  const options = {
    projectId: process.env.NEON_PROJECT_ID!,
    apiKey: process.env.NEON_API_KEY!,
    ownerName: process.env.NEON_DATABASE_OWNER_NAME!,
    provisioningBranchId: process.env.NEON_PROVISIONING_BRANCH_ID!,
  }

  safeWrite("Phase 1/2: reconcile primary branch, matriz database and endpoint.")
  const primary = await reconcilePrimaryPhase(mode, options)
  validateDatabaseUrl(process.env.NEON_PRIMARY_DATABASE_URL, primary.endpointMetadata.host)
  if (mode === "apply") executeTopologySql(buildProvisioningSql(), { databaseUrl: process.env.NEON_PRIMARY_DATABASE_URL })
  executeTopologySql(buildVerificationSql(), { databaseUrl: process.env.NEON_PRIMARY_DATABASE_URL })
  safeWrite("Phase 1/2 passed: primary topology and SQL baseline verified.")

  safeWrite("Phase 2/2: reconcile CI branch, matriz database and endpoint.")
  const ci = await reconcileCiPhase(mode, options)
  if (!process.env.NEON_CI_DATABASE_URL) {
    throw new Error("NEON_CI_DATABASE_URL is required after CI endpoint reconciliation; obtain it from Neon and resume the idempotent command")
  }
  validateDatabaseUrl(process.env.NEON_CI_DATABASE_URL, ci.endpointMetadata.host)
  if (mode === "apply") executeTopologySql(buildProvisioningSql(), { databaseUrl: process.env.NEON_CI_DATABASE_URL })
  executeTopologySql(buildVerificationSql(), { databaseUrl: process.env.NEON_CI_DATABASE_URL })
  safeWrite(
    `Topology ${mode} passed on primary and CI databases; secrets were not printed.`,
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown topology failure"
  process.stderr.write(`${redactSensitiveText(message)}\n`)
  process.exitCode = 1
})
