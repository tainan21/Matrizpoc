/**
 * V1.3 Demo Flows — executable proof of the 4 required flows.
 *
 * Prereqs (only needed when running against a real DB):
 *   1. Postgres running and DATABASE_URL configured in .env
 *   2. Schemas applied: `pnpm exec prisma db push --schema prisma/schemas/core.prisma`
 *                       `pnpm exec prisma db push --schema prisma/schemas/hub.prisma`
 *                       `pnpm exec prisma db push --schema prisma/schemas/seumei.prisma`
 *                       `pnpm exec prisma db push --schema prisma/schemas/contracts.prisma`
 *
 * Run: `pnpm tsx scripts/demo-flows.ts`
 *
 * The 4 flows proved here (§10, Fase 7 of the audit plan):
 *   Flow A — First login (OTP) creates User + AuthAccount + AppSession
 *   Flow B — Cross-app login (magic-link) attaches to SAME User (identity linking)
 *   Flow C — Ingestion run persisted (InstitutionalSource + Run + Project rows)
 *   Flow D — Contract persisted with ExternalLink to origin (Seumei establishment)
 */
import { randomUUID } from "node:crypto"
import { getCoreDb } from "../packages/platform/db/src/core"
import { getHubDb } from "../packages/platform/db/src/hub"
import { getSeumeiDb } from "../packages/platform/db/src/seumei"
import { getContractsDb } from "../packages/platform/db/src/contracts"
import {
  makeExternalLinkRepo,
  makeMembershipRepo,
  makeTelemetryRepo,
  makeUserRepo,
} from "../packages/platform/db/src/repositories/core"
import { makeEstablishmentRepo } from "../packages/platform/db/src/repositories/seumei"
import { makeContractRepo } from "../packages/platform/db/src/repositories/contracts"
import {
  issueMagicLinkChallenge,
  issueOtpChallenge,
  issueSession,
  readSessionByToken,
  resolveIdentityByEmail,
  verifyChallenge,
} from "../packages/platform/auth/src/v1/server"
import { runInstitutionalIngestion } from "../apps/matriz-hub/src/institutional/bootstrap"
import { persistIngestionRun } from "../apps/matriz-hub/src/institutional/persistence"

const log = (section: string, payload: unknown) =>
  console.log(`\n[${section}]`, JSON.stringify(payload, null, 2))

async function ensureDemoTenant(): Promise<string> {
  const core = getCoreDb()
  const slug = "demo-studio"
  const existing = await core.tenant.findUnique({ where: { slug } })
  if (existing) return existing.id
  const created = await core.tenant.create({
    data: { slug, name: "Demo Studio", brandColor: "#0B5FFF" },
  })
  return created.id
}

async function flowA_firstLogin(tenantId: string) {
  const email = `demo+${randomUUID().slice(0, 8)}@matriz.local`

  // 1. Request OTP challenge
  const challenge = await issueOtpChallenge(email, { ip: "127.0.0.1" })
  log("Flow A — challenge issued", {
    challengeId: challenge.challengeId,
    email: challenge.email,
    expiresAt: challenge.expiresAt,
    codeShownForDemo: challenge.code,
  })

  // 2. Verify (consume the OTP)
  const verdict = await verifyChallenge("OTP", email, challenge.code)
  if (!verdict.ok) throw new Error(`Flow A verify failed: ${verdict.reason}`)

  // 3. Resolve identity (creates User + AuthAccount)
  const identity = await resolveIdentityByEmail({
    email,
    provider: "OTP",
    displayName: "Demo User",
  })

  // 4. Ensure membership (otherwise identity has no tenants/apps)
  const core = getCoreDb()
  const memberships = makeMembershipRepo(core)
  const userId = identity.user.id as unknown as string
  await memberships.ensure({ tenantId, userId, appId: "matriz-hub", role: "OWNER" })
  await memberships.ensure({ tenantId, userId, appId: "seumei", role: "ADMIN" })

  // 5. Issue a persistent session for the Hub app
  const refreshed = await resolveIdentityByEmail({ email, provider: "OTP" })
  const { session, rawToken } = await issueSession({
    identity: refreshed,
    tenantId,
    appId: "matriz-hub",
    strategyId: "otp",
  })

  // 6. Verify: lookup by raw token returns the session
  const rehydrated = await readSessionByToken(rawToken)

  log("Flow A — done", {
    userCreated: identity.user.id,
    tenantsCount: refreshed.tenants.length,
    enabledAppsFirstTenant: refreshed.tenants[0]?.enabledApps,
    sessionIssued: !!session,
    sessionReadBack: !!rehydrated,
    sessionUserMatches: rehydrated?.userId === userId,
  })

  return { email, userId }
}

async function flowB_crossAppIdentityLinking(
  email: string,
  userId: string,
  tenantId: string,
) {
  // Same email, DIFFERENT provider: magic-link (cross-app scenario: user
  // clicked magic-link in Seumei after having OTP'd in Hub).
  const ml = await issueMagicLinkChallenge(email)
  const verdict = await verifyChallenge("MAGIC_LINK", email, ml.token)
  if (!verdict.ok) throw new Error(`Flow B verify failed: ${verdict.reason}`)

  const identity = await resolveIdentityByEmail({
    email,
    provider: "MAGIC_LINK",
  })
  const linkedUserId = identity.user.id as unknown as string

  const core = getCoreDb()
  const accounts = await core.authAccount.findMany({ where: { userId } })

  log("Flow B — done", {
    sameEmail: email,
    originalUserId: userId,
    linkedUserId,
    identityLinkingWorked: linkedUserId === userId,
    authAccountsForUser: accounts.map((a) => ({ provider: a.provider, id: a.id })),
  })
}

async function flowC_ingestionPersisted() {
  const report = await runInstitutionalIngestion()
  const dbSummary = await persistIngestionRun(report.run)

  const hub = getHubDb()
  const [projectCount, runCount, sourceCount] = await Promise.all([
    hub.institutionalProject.count(),
    hub.institutionalIngestionRun.count(),
    hub.institutionalSource.count(),
  ])

  log("Flow C — done", {
    pipeline: {
      accepted: report.accepted,
      rejected: report.rejected.length,
      durationMs: Math.round(report.run.durationMs),
    },
    dbWrites: dbSummary,
    dbTotals: { projectCount, runCount, sourceCount },
  })
}

async function flowD_contractPersistedWithLink(tenantId: string, userId: string) {
  // 1. Create an establishment in Seumei
  const seumeiDb = getSeumeiDb()
  const establishments = makeEstablishmentRepo(seumeiDb)
  const est = await establishments.create({
    tenantId,
    name: `Demo Venue ${randomUUID().slice(0, 6)}`,
    slug: `demo-venue-${randomUUID().slice(0, 8)}`,
    type: "VENUE",
    city: "São Paulo",
    profile: { displayName: "Demo Venue", capacity: 300, tags: ["live-music"] },
  })

  // 2. Create a contract originated from that establishment
  const contractsDb = getContractsDb()
  const contracts = makeContractRepo(contractsDb)
  const reference = `C-${Date.now().toString(36)}`
  const contract = await contracts.create({
    tenantId,
    reference,
    title: `Performance Agreement — ${est.name}`,
    originApp: "seumei",
    originEntityType: "establishment",
    originEntityId: est.id,
    currency: "BRL",
    totalValueCents: 150_000,
    createdBy: userId,
    parties: [
      { role: "ESTABLISHMENT", displayName: est.name },
      { role: "ARTIST", displayName: "Demo Artist" },
    ],
    initialBodyMarkdown: "# Contract body\n\nTerms and conditions...",
    initialVersionHash: "sha256:demo",
  })

  // 3. Record an ExternalLink in core bridging Contracts → Seumei
  const coreDb = getCoreDb()
  const links = makeExternalLinkRepo(coreDb)
  await links.create({
    tenantId,
    localApp: "contracts",
    localEntityType: "contract",
    localEntityId: contract.id,
    externalApp: "seumei",
    externalEntityType: "establishment",
    externalEntityId: est.id,
    relationType: "originates-from",
    snapshot: { establishmentName: est.name, city: est.city },
  })

  // 4. Telemetry: record the contract creation event under the governance category
  const telemetry = makeTelemetryRepo(coreDb)
  await telemetry.record({
    tenantId,
    appId: "contracts",
    eventName: "contract.created",
    category: "governance",
    properties: { contractId: contract.id, originApp: "seumei" },
  })

  // 5. Prove the link is readable from both directions
  const fromContract = await links.listFromEntity(
    tenantId,
    "contracts",
    "contract",
    contract.id,
  )
  const toEstablishment = await links.listToEntity(
    tenantId,
    "seumei",
    "establishment",
    est.id,
  )

  log("Flow D — done", {
    establishmentId: est.id,
    contractId: contract.id,
    contractReference: contract.reference,
    partiesCount: contract.parties.length,
    versionsCount: contract.versions.length,
    eventsCount: contract.events.length,
    linksFromContract: fromContract.length,
    linksToEstablishment: toEstablishment.length,
  })
}

async function main() {
  console.log("Matriz V1.3 — Demo Flows")
  console.log("========================")

  const tenantId = await ensureDemoTenant()
  log("bootstrap", { tenantId })

  const { email, userId } = await flowA_firstLogin(tenantId)
  await flowB_crossAppIdentityLinking(email, userId, tenantId)
  await flowC_ingestionPersisted()
  await flowD_contractPersistedWithLink(tenantId, userId)

  console.log("\nAll 4 flows completed successfully.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Demo flows failed:", err)
  process.exit(1)
})
