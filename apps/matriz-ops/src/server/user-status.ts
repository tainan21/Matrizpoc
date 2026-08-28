import { createHash } from "node:crypto"
import { getCoreDb } from "@matriz/platform-db/core"

export async function changeUserStatus(userId: string, action: "suspend" | "restore") {
  const before = await getCoreDb().user.findUnique({ where: { id: userId } })
  if (!before) throw new Error("USER_NOT_FOUND")
  if (before.status === "ANONYMIZED") throw new Error("ANONYMIZED_USER_IMMUTABLE")
  const after = await getCoreDb().$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: userId }, data: action === "suspend" ? { status: "SUSPENDED", suspendedAt: new Date() } : { status: "ACTIVE", suspendedAt: null, suspensionReason: null } })
    if (action === "suspend") await tx.appSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    return updated
  })
  return { before, after }
}

export async function anonymizeUser(userId: string) {
  const before = await getCoreDb().user.findUnique({ where: { id: userId } })
  if (!before) throw new Error("USER_NOT_FOUND")
  if (before.status === "ANONYMIZED") return { before, after: before }
  const digest = createHash("sha256").update(before.email.trim().toLowerCase()).digest("hex")
  const after = await getCoreDb().$transaction(async (tx) => {
    await tx.appSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    await tx.appGrant.updateMany({ where: { membership: { userId }, revokedAt: null }, data: { revokedAt: new Date(), revocationReason: "USER_ANONYMIZED" } })
    await tx.tenantMembership.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revocationReason: "USER_ANONYMIZED" } })
    return tx.user.update({ where: { id: userId }, data: { status: "ANONYMIZED", anonymizedAt: new Date(), anonymizedEmailHash: digest, email: `anonymized+${userId}@invalid.matriz`, displayName: "Usuário anonimizado", avatarUrl: null, locale: null, timezone: null } })
  })
  return { before, after }
}
