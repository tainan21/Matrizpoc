import type { CorePrismaClient } from "@matriz/platform-db/core"
import type { SeumeiInternalAccess } from "./seumei-internal-api.js"

type ObjectInput = Record<string, unknown>
const object = (value: unknown): ObjectInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_request")
  return value as ObjectInput
}
const text = (input: ObjectInput, key: string): string => {
  const value = input[key]
  if (typeof value !== "string" || !value) throw new Error("invalid_request")
  return value
}
const date = (input: ObjectInput, key: string): Date => {
  const value = new Date(text(input, key))
  if (Number.isNaN(value.getTime())) throw new Error("invalid_request")
  return value
}
const appId = "seumei"
type MembershipRoleValue = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
const role = (input: ObjectInput, key: string): MembershipRoleValue => {
  const value = text(input, key)
  if (!["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(value)) throw new Error("invalid_request")
  return value as MembershipRoleValue
}

export function createSeumeiInternalAccess(db: CorePrismaClient): SeumeiInternalAccess {
  return { async invoke(action, raw) {
    const input = typeof raw === "string" ? raw : object(raw)
    switch (action) {
      case "resolveUser": { const value = object(raw); const email = text(value, "email").trim().toLowerCase(); const name = text(value, "name").trim(); const user = await db.user.upsert({ where: { email }, create: { email, displayName: name || email.split("@")[0]! }, update: name ? { displayName: name } : {} }); return { id: user.id, name: user.displayName, email: user.email } }
      case "listSeumeiMemberships": { const rows = await db.membership.findMany({ where: { userId: String(input), appId }, select: { tenantId: true, role: true }, orderBy: { createdAt: "asc" } }); return rows }
      case "hasSeumeiMembership": { const value = object(raw); return Boolean(await db.membership.findUnique({ where: { tenantId_userId_appId: { tenantId: text(value, "tenantId"), userId: text(value, "userId"), appId } }, select: { id: true } })) }
      case "listTenantMembers": { const rows = await db.membership.findMany({ where: { tenantId: String(input), appId }, select: { id: true, userId: true, role: true, createdAt: true, user: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" } }); return rows.map(row => ({ id: row.id, userId: row.userId, name: row.user.displayName, email: row.user.email, role: row.role, joinedAt: row.createdAt.toISOString() })) }
      case "listPendingInvitations": { const rows = await db.membershipInvitation.findMany({ where: { tenantId: String(input), appId, status: "PENDING" }, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: "asc" } }); return rows.map(row => ({ ...row, expiresAt: row.expiresAt.toISOString(), createdAt: row.createdAt.toISOString() })) }
      case "createInvitation": { const value = object(raw); const row = await db.membershipInvitation.upsert({ where: { tenantId_appId_email: { tenantId: text(value, "tenantId"), appId, email: text(value, "email") } }, create: { tenantId: text(value, "tenantId"), appId, email: text(value, "email"), role: role(value, "role"), tokenHash: text(value, "tokenHash"), invitedByUserId: text(value, "invitedByUserId"), expiresAt: date(value, "expiresAt"), status: "PENDING" }, update: { role: role(value, "role"), tokenHash: text(value, "tokenHash"), invitedByUserId: text(value, "invitedByUserId"), expiresAt: date(value, "expiresAt"), status: "PENDING", acceptedByUserId: null, acceptedAt: null, revokedAt: null }, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true } }); return { ...row, expiresAt: row.expiresAt.toISOString(), createdAt: row.createdAt.toISOString() } }
      case "revokeInvitation": { const value = object(raw); const result = await db.membershipInvitation.updateMany({ where: { id: text(value, "invitationId"), tenantId: text(value, "tenantId"), appId, status: "PENDING" }, data: { status: "REVOKED", revokedAt: date(value, "revokedAt") } }); return result.count === 1 }
      case "readInvitation": { const row = await db.membershipInvitation.findUnique({ where: { tokenHash: String(input) }, select: { id: true, tenantId: true, email: true, role: true, status: true, expiresAt: true, acceptedByUserId: true } }); return row ? { ...row, expiresAt: row.expiresAt.toISOString() } : null }
      case "acceptInvitation": { const value = object(raw); return db.$transaction(async tx => { const invitation = await tx.membershipInvitation.findUnique({ where: { tokenHash: text(value, "tokenHash") } }); if (!invitation || invitation.appId !== appId) return { kind: "invalid" }; if (invitation.status === "ACCEPTED") return invitation.acceptedByUserId === text(value, "userId") ? { kind: "accepted", tenantId: invitation.tenantId, role: invitation.role } : { kind: "unusable" }; if (invitation.status !== "PENDING") return { kind: "unusable" }; const acceptedAt = date(value, "acceptedAt"); if (invitation.expiresAt <= acceptedAt) return { kind: "expired" }; if (invitation.email !== text(value, "email").trim().toLowerCase()) return { kind: "email_mismatch" }; const registration = await tx.appRegistration.findUnique({ where: { tenantId_appId: { tenantId: invitation.tenantId, appId } }, select: { enabled: true } }); if (!registration?.enabled) return { kind: "disabled" }; const claimed = await tx.membershipInvitation.updateMany({ where: { id: invitation.id, appId, status: "PENDING" }, data: { status: "ACCEPTED", acceptedByUserId: text(value, "userId"), acceptedAt } }); if (claimed.count !== 1) return { kind: "conflict" }; const membership = await tx.membership.upsert({ where: { tenantId_userId_appId: { tenantId: invitation.tenantId, userId: text(value, "userId"), appId } }, create: { tenantId: invitation.tenantId, userId: text(value, "userId"), appId, role: invitation.role, invitedAt: acceptedAt }, update: { lastActiveAt: acceptedAt }, select: { role: true } }); return { kind: "accepted", tenantId: invitation.tenantId, role: membership.role } }) }
      case "findTenantMember": { const value = object(raw); const row = await db.membership.findFirst({ where: { id: text(value, "membershipId"), tenantId: text(value, "tenantId"), appId }, select: { id: true, userId: true, role: true, createdAt: true, user: { select: { displayName: true, email: true } } } }); return row ? { id: row.id, userId: row.userId, name: row.user.displayName, email: row.user.email, role: row.role, joinedAt: row.createdAt.toISOString() } : null }
      case "changeMembershipRole": { const value = object(raw); const result = await db.membership.updateMany({ where: { id: text(value, "membershipId"), tenantId: text(value, "tenantId"), appId, role: role(value, "expectedRole") }, data: { role: role(value, "role") } }); return result.count === 1 }
      case "removeMembership": { const value = object(raw); const result = await db.membership.deleteMany({ where: { id: text(value, "membershipId"), tenantId: text(value, "tenantId"), appId, role: role(value, "expectedRole") } }); return result.count === 1 }
      case "provisionOwner": { const value = object(raw); await db.$transaction(async tx => { const tenantId = text(value, "tenantId"); await tx.tenant.upsert({ where: { id: tenantId }, create: { id: tenantId, name: text(value, "tenantName"), slug: text(value, "tenantSlug") }, update: { name: text(value, "tenantName"), slug: text(value, "tenantSlug") } }); await tx.appRegistration.upsert({ where: { tenantId_appId: { tenantId, appId } }, create: { tenantId, appId, manifestVersion: "0.1.0", contractVersion: "v1", enabled: true }, update: { enabled: true, disabledAt: null } }); await tx.membership.upsert({ where: { tenantId_userId_appId: { tenantId, userId: text(value, "userId"), appId } }, create: { tenantId, userId: text(value, "userId"), appId, role: "OWNER" }, update: { role: "OWNER", lastActiveAt: new Date() } }) }); return null }
      case "provisionMembership": { const value = object(raw); const tenantId = text(value, "tenantId"); await db.$transaction(async tx => { const registration = await tx.appRegistration.findUnique({ where: { tenantId_appId: { tenantId, appId } }, select: { enabled: true } }); if (!registration?.enabled) throw new Error("registration_disabled"); await tx.membership.upsert({ where: { tenantId_userId_appId: { tenantId, userId: text(value, "userId"), appId } }, create: { tenantId, userId: text(value, "userId"), appId, role: role(value, "role") }, update: { role: role(value, "role"), lastActiveAt: new Date() } }) }); return null }
      case "removeProvisionedTenant": { const value = object(raw); await db.$transaction(async tx => { const tenantId = text(value, "tenantId"); const [count, owner] = await Promise.all([tx.membership.count({ where: { tenantId } }), tx.membership.findUnique({ where: { tenantId_userId_appId: { tenantId, userId: text(value, "userId"), appId } }, select: { role: true } })]); if (count !== 1 || owner?.role !== "OWNER") throw new Error("compensation_conflict"); await tx.tenant.delete({ where: { id: tenantId } }) }); return null }
      default: throw new Error("unknown_action")
    }
  } }
}
