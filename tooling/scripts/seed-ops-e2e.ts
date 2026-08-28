import { createHash } from "node:crypto"
import { getCoreDb } from "@matriz/platform-db/core"
import { getOpsDb } from "@matriz/platform-db/ops"

export const E2E_OPS_SESSION_TOKEN = "ops-e2e-session-token"
const tenantId = "tenant-ops-e2e"

async function ensureE2eWallets(userIds: readonly string[]) {
  const baseUrl = process.env.MATRIZ_PAY_INTERNAL_URL
  const serviceToken = process.env.MATRIZ_OPS_SERVICE_TOKEN
  if (!baseUrl || !serviceToken) return

  for (const userId of userIds) {
    const response = await fetch(`${baseUrl}/api/v1/wallets/users/${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${serviceToken}` },
    })
    if (!response.ok) throw new Error(`Unable to create E2E wallet for ${userId}: ${response.status}`)
  }
}

async function seed() {
  const core = getCoreDb()
  const ops = getOpsDb()
  await core.tenant.upsert({ where: { id: tenantId }, update: { name: "Matriz Operação" }, create: { id: tenantId, slug: "matriz-operacao-e2e", name: "Matriz Operação", brandColor: "#6d4aff" } })
  const users = [
    { id: "user-owner-e2e", email: "owner@matriz.local", displayName: "Tainá · Owner", status: "ACTIVE" as const },
    { id: "user-integration", email: "marina@matriz.local", displayName: "Marina Costa", status: "ACTIVE" as const },
    { id: "user-brl-integration", email: "rafael@matriz.local", displayName: "Rafael Nunes", status: "ACTIVE" as const },
    { id: "user-suspended-e2e", email: "suspenso@matriz.local", displayName: "Conta em revisão", status: "SUSPENDED" as const },
  ]
  for (const user of users) await core.user.upsert({ where: { email: user.email }, update: { displayName: user.displayName, status: user.status }, create: user })
  await core.platformOperator.upsert({ where: { userId: "user-owner-e2e" }, update: { role: "OWNER", active: true, revokedAt: null }, create: { userId: "user-owner-e2e", role: "OWNER", active: true } })
  for (const user of users) {
    const membership = await core.tenantMembership.upsert({ where: { tenantId_userId: { tenantId, userId: user.id } }, update: { revokedAt: null, tenantRoles: [user.id === "user-owner-e2e" ? "OWNER" : "MEMBER"] }, create: { tenantId, userId: user.id, tenantRoles: [user.id === "user-owner-e2e" ? "OWNER" : "MEMBER"], acceptedAt: new Date(), lastActiveAt: new Date() } })
    await core.appGrant.upsert({ where: { tenantId_membershipId_appId: { tenantId, membershipId: membership.id, appId: "matriz-ops" } }, update: { revokedAt: null, appRoles: [user.id === "user-owner-e2e" ? "OWNER" : "MEMBER"] }, create: { tenantId, membershipId: membership.id, appId: "matriz-ops", appRoles: [user.id === "user-owner-e2e" ? "OWNER" : "MEMBER"], capabilities: [] } })
  }
  for (const appId of ["matriz-hub", "matriz-ops", "matriz-pay", "spot", "contracts"]) await core.appRegistration.upsert({ where: { tenantId_appId: { tenantId, appId } }, update: { enabled: true, manifestVersion: "0.1.0" }, create: { tenantId, appId, enabled: true, manifestVersion: "0.1.0" } })
  await core.appSession.deleteMany({ where: { userId: "user-owner-e2e", appId: "matriz-ops" } })
  await core.appSession.create({ data: { userId: "user-owner-e2e", tenantId, appId: "matriz-ops", strategyId: "otp", tokenHash: createHash("sha256").update(E2E_OPS_SESSION_TOKEN).digest("hex"), issuedAt: new Date(), expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), lastSeenAt: new Date() } })
  await core.authVerificationChallenge.deleteMany({ where: { email: "owner@matriz.local", kind: "OTP" } })
  await core.authVerificationChallenge.create({ data: { kind: "OTP", email: "owner@matriz.local", codeHash: "e2e-consumed", expiresAt: new Date(Date.now() + 5 * 60 * 1000), consumedAt: new Date() } })
  const now = Date.now()
  const telemetry = ["matriz-hub", "matriz-ops", "matriz-pay", "spot", "contracts"].flatMap((appId, index) => Array.from({ length: 6 }, (_, event) => ({
    sourceEventId: `e2e-${appId}-${event}`, tenantId, appId, eventName: event === 5 && index === 2 ? "request.error" : "request.completed", eventVersion: "v1", category: "operational", occurredAt: new Date(now - (index * 60 + event) * 60 * 1000),
    properties: { subjectHash: `subject-${event % 3}`, sessionHash: `session-${event % 2}`, durationMs: 80 + index * 35 + event * 7, appVersion: "0.1.0", error: event === 5 && index === 2 },
  })))
  await core.telemetryRecord.createMany({ skipDuplicates: true, data: telemetry })
  await ensureE2eWallets(users.filter((user) => user.status !== "SUSPENDED").map((user) => user.id))
  await ops.opsAuditEvent.deleteMany({ where: { correlationId: { startsWith: "e2e-" } } })
  await ops.opsAuditEvent.create({ data: { actorUserId: "user-owner-e2e", actorRole: "OWNER", action: "users.manage", targetType: "user", targetId: "user-suspended-e2e", reason: "Revisão preventiva da conta", correlationId: "e2e-audit-1", beforeJson: { status: "ACTIVE" }, afterJson: { status: "SUSPENDED" } } })
  process.stdout.write(`${E2E_OPS_SESSION_TOKEN}\n`)
}

seed().finally(async () => { await Promise.all([getCoreDb().$disconnect(), getOpsDb().$disconnect()]) })
