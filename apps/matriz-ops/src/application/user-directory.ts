import { getCoreDb } from "@matriz/platform-db/core"

export async function listUserDirectory(query = "") {
  const normalized = query.trim()
  const users = await getCoreDb().user.findMany({
    where: normalized ? { OR: [{ email: { contains: normalized, mode: "insensitive" } }, { displayName: { contains: normalized, mode: "insensitive" } }] } : {},
    include: {
      platformOperator: true,
      memberships: { include: { tenant: { select: { id: true, name: true } }, appGrants: { where: { revokedAt: null }, select: { appId: true, appRoles: true, capabilities: true } } } },
      appSessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, appId: true, strategyId: true, issuedAt: true, expiresAt: true, lastSeenAt: true } },
    }, orderBy: { createdAt: "desc" }, take: 200,
  })
  return users.map((user) => ({
    id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl,
    status: user.status, operatorRole: user.platformOperator?.active ? user.platformOperator.role : null,
    tenantCount: user.memberships.filter((membership) => !membership.revokedAt).length,
    appIds: [...new Set(user.memberships.flatMap((membership) => membership.appGrants.map((grant) => grant.appId)))].sort(),
    activeSessions: user.appSessions.length,
    lastActiveAt: user.appSessions.map((session) => session.lastSeenAt).sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
  }))
}

export async function loadOpsOverview() {
  const db = getCoreDb()
  const [users, activeUsers, suspendedUsers, activeSessions, operators, platforms] = await Promise.all([
    db.user.count(), db.user.count({ where: { status: "ACTIVE" } }), db.user.count({ where: { status: "SUSPENDED" } }),
    db.appSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    db.platformOperator.count({ where: { active: true, revokedAt: null } }), db.appRegistration.count({ where: { enabled: true } }),
  ])
  return { users, activeUsers, suspendedUsers, activeSessions, operators, platforms }
}

export async function getUserDirectoryEntry(userId: string) {
  const user = await getCoreDb().user.findUnique({
    where: { id: userId },
    include: {
      platformOperator: true,
      memberships: {
        include: {
          tenant: { select: { id: true, name: true } },
          appGrants: { select: { id: true, appId: true, appRoles: true, capabilities: true, grantedAt: true, revokedAt: true } },
        },
      },
      appSessions: { orderBy: { lastSeenAt: "desc" }, take: 50, select: { id: true, appId: true, strategyId: true, issuedAt: true, expiresAt: true, lastSeenAt: true, revokedAt: true } },
    },
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    timezone: user.timezone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    operatorRole: user.platformOperator?.active ? user.platformOperator.role : null,
    memberships: user.memberships.map((membership) => ({
      id: membership.id,
      tenant: membership.tenant,
      tenantRoles: membership.tenantRoles,
      acceptedAt: membership.acceptedAt?.toISOString() ?? null,
      lastActiveAt: membership.lastActiveAt?.toISOString() ?? null,
      revokedAt: membership.revokedAt?.toISOString() ?? null,
      grants: membership.appGrants.map((grant) => ({ ...grant, grantedAt: grant.grantedAt.toISOString(), revokedAt: grant.revokedAt?.toISOString() ?? null })),
    })),
    sessions: user.appSessions.map((session) => ({ ...session, issuedAt: session.issuedAt.toISOString(), expiresAt: session.expiresAt.toISOString(), lastSeenAt: session.lastSeenAt.toISOString(), revokedAt: session.revokedAt?.toISOString() ?? null })),
  }
}

export async function listPlatforms() {
  const registrations = await getCoreDb().appRegistration.findMany({
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: [{ appId: "asc" }, { tenantId: "asc" }],
  })
  return registrations.map((item) => ({
    id: item.id,
    appId: item.appId,
    enabled: item.enabled,
    tenant: item.tenant,
    manifestVersion: item.manifestVersion,
    contractVersion: item.contractVersion,
    enabledAt: item.enabledAt.toISOString(),
    disabledAt: item.disabledAt?.toISOString() ?? null,
  }))
}
