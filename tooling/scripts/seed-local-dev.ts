import { getContractsDb } from "@matriz/platform-db/contracts"
import { getCoreDb } from "@matriz/platform-db/core"
import { getHubDb } from "@matriz/platform-db/hub"
import { getOpsDb } from "@matriz/platform-db/ops"
import { getPayDb } from "@matriz/platform-db/pay"
import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { getSpotDb } from "@matriz/platform-db/spot"
import { getWilldashDb } from "@matriz/platform-db/willdash"
import { assertLocalSeedEnvironment } from "../local-infrastructure/local-seed-policy"
import { infrastructureContractV1Schema, type InfrastructureContractV1 } from "../../packages/integration/infrastructure-contracts/src/index"
import { readdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildLocalOidcClientRegistrations } from "../local-infrastructure/local-oidc-clients"

const tenantId = "tenant-local-dev"
const ownerId = "user-local-owner"
const operatorId = "user-local-operator"
const deniedId = "user-local-denied"
const productApps = ["matriz-hub", "spot", "seumei", "contracts", "willdash", "matriz-ops", "matriz-pay", "matriz-admin", "matriz-client-admin"] as const

async function localContracts(): Promise<InfrastructureContractV1[]> {
  const appsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps")
  const contracts: InfrastructureContractV1[] = []
  for (const entry of await readdir(appsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    try { contracts.push(infrastructureContractV1Schema.parse(JSON.parse(await readFile(resolve(appsRoot, entry.name, "infrastructure.json"), "utf8")))) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  }
  return contracts
}

async function seedCore() {
  const core = getCoreDb()
  await core.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('matriz.tenant_id', ${tenantId}, true)`
    await tx.tenant.upsert({ where: { id: tenantId }, update: { name: "Empresa Local Matriz" }, create: { id: tenantId, slug: "empresa-local-matriz", name: "Empresa Local Matriz", brandColor: "#6d4aff" } })
    const users = [
      { id: ownerId, email: "owner@matriz.local", displayName: "Owner Local" },
      { id: operatorId, email: "operator@matriz.local", displayName: "Operador Local" },
      { id: deniedId, email: "sem-acesso@matriz.local", displayName: "Usuário sem acesso" },
    ] as const
    for (const user of users) await tx.user.upsert({ where: { id: user.id }, update: { email: user.email, displayName: user.displayName, status: "ACTIVE" }, create: { ...user, status: "ACTIVE" } })
    await tx.platformOperator.upsert({ where: { userId: ownerId }, update: { role: "OWNER", active: true, revokedAt: null }, create: { userId: ownerId, role: "OWNER", active: true } })
    await tx.platformOperator.upsert({ where: { userId: operatorId }, update: { role: "OPERATOR", active: true, revokedAt: null }, create: { userId: operatorId, role: "OPERATOR", active: true } })

    for (const userId of [ownerId, operatorId, deniedId]) {
      const membership = await tx.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId, userId } },
        update: { revokedAt: null, tenantRoles: [userId === ownerId ? "OWNER" : "MEMBER"], acceptedAt: new Date(0) },
        create: { tenantId, userId, tenantRoles: [userId === ownerId ? "OWNER" : "MEMBER"], acceptedAt: new Date(0) },
      })
      if (userId !== deniedId) for (const appId of productApps) await tx.appGrant.upsert({
        where: { tenantId_membershipId_appId: { tenantId, membershipId: membership.id, appId } },
        update: { appRoles: [userId === ownerId ? "OWNER" : "MEMBER"], capabilities: appId === "matriz-client-admin" ? ["client-admin.dashboard.read", "client-admin.refresh"] : [], revokedAt: null },
        create: { tenantId, membershipId: membership.id, appId, appRoles: [userId === ownerId ? "OWNER" : "MEMBER"], capabilities: appId === "matriz-client-admin" ? ["client-admin.dashboard.read", "client-admin.refresh"] : [] },
      })
    }
    for (const appId of productApps) await tx.appRegistration.upsert({ where: { tenantId_appId: { tenantId, appId } }, update: { enabled: true }, create: { tenantId, appId, enabled: true, manifestVersion: "0.1.0" } })
    for (const client of buildLocalOidcClientRegistrations(await localContracts(), process.env)) await tx.oidcClient.upsert({
      where: { clientId: client.clientId },
      update: client,
      create: client,
    })
  })
}

async function seedDomains() {
  const hub = getHubDb()
  await hub.institutionalProject.upsert({ where: { projectId: "matriz:local-dev" }, update: { lastSeenAt: new Date(0) }, create: { projectId: "matriz:local-dev", sourceType: "local", trustLevel: "reviewed", ingestMode: "manual", institutionalTags: ["local", tenantId], manifestJson: { appId: "matriz-hub", tenantId }, firstSeenAt: new Date(0), lastSeenAt: new Date(0) } })

  const spot = getSpotDb()
  await spot.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('matriz.tenant_id', ${tenantId}, true)`
    await tx.band.upsert({ where: { tenantId_slug: { tenantId, slug: "banda-local" } }, update: { name: "Banda Local Matriz" }, create: { id: "spot-band-local", tenantId, slug: "banda-local", name: "Banda Local Matriz", genre: "MPB", memberCount: 3 } })
  })

  const seumei = getSeumeiDb()
  await seumei.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('matriz.tenant_id', ${tenantId}, true)`
    await tx.establishment.upsert({ where: { tenantId_slug: { tenantId, slug: "empresa-local" } }, update: { name: "Empresa Local Matriz" }, create: { id: "seumei-establishment-local", tenantId, slug: "empresa-local", name: "Empresa Local Matriz", type: "RESTAURANT", city: "São Paulo" } })
  })

  const contracts = getContractsDb()
  await contracts.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('matriz.tenant_id', ${tenantId}, true)`
    await tx.contract.upsert({ where: { tenantId_reference: { tenantId, reference: "LOCAL-001" } }, update: { title: "Contrato local de demonstração" }, create: { id: "contract-local-001", tenantId, reference: "LOCAL-001", title: "Contrato local de demonstração", originApp: "spot", originEntityType: "band", originEntityId: "spot-band-local", createdBy: ownerId } })
  })

  const willdash = getWilldashDb()
  await willdash.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('matriz.tenant_id', ${tenantId}, true)`
    await tx.goal.upsert({ where: { id: "willdash-goal-local" }, update: { title: "Validar ambiente local" }, create: { id: "willdash-goal-local", tenantId, ownerId, title: "Validar ambiente local", metric: "PERCENT", target: 100, unit: "%", progress: 25 } })
  })

  const ops = getOpsDb()
  await ops.opsAuditEvent.upsert({ where: { actorUserId_idempotencyKey: { actorUserId: ownerId, idempotencyKey: "seed-local-v1" } }, update: { reason: "Seed local V1 validado" }, create: { actorUserId: ownerId, actorRole: "OWNER", action: "infrastructure.seed", targetType: "environment", targetId: "local", reason: "Seed local V1 validado", correlationId: "seed-local-v1", idempotencyKey: "seed-local-v1", afterJson: { tenantId, schemas: 8 } } })

  const pay = getPayDb()
  for (const userId of [ownerId, operatorId, deniedId]) await pay.wallet.upsert({ where: { userId }, update: { status: "ACTIVE" }, create: { id: `wallet-${userId}`, userId, status: "ACTIVE", accounts: { create: [{ currency: "MTRZ" }, { currency: "BRL" }] } } })
}

async function main() {
  assertLocalSeedEnvironment(process.env)
  const clients = [getCoreDb(), getHubDb(), getSpotDb(), getSeumeiDb(), getContractsDb(), getWilldashDb(), getOpsDb(), getPayDb()]
  try {
    await seedCore()
    await seedDomains()
    process.stdout.write("Matriz local development seed is ready.\n")
  }
  finally { await Promise.all(clients.map((client) => client.$disconnect())) }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Local seed failed"}\n`); process.exitCode = 1 })
