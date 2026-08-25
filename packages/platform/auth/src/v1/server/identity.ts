/**
 * Real server-side identity resolution.
 *
 * V1.3 identity linking policy: AUTOMATIC BY NORMALIZED EMAIL.
 * If a user with same email already exists in core.users, any new
 * AuthAccount for a different provider attaches to the SAME User row.
 *
 * No confirmation step in this phase — email ownership is considered
 * proven by the successful challenge (OTP/magic-link went to the email).
 */
import { getCoreDb } from "@matriz/platform-db/core"
import type { AuthProvider } from "@matriz/platform-db/core"
import {
  makeAuthAccountRepo,
  makeTenantAccessRepo,
  makeUserRepo,
  normalizeEmail,
} from "@matriz/platform-db/core/repositories"
import { asAppId, asTenantId, asUserId } from "@matriz/foundation-types"
import type { AppIdLiteral } from "@matriz/foundation-types"
import type { AuthIdentity } from "../types"

const KNOWN_APP_IDS: readonly AppIdLiteral[] = [
  "matriz-hub",
  "spot",
  "matriz-admin",
  "seumei",
  "contracts",
  "willdash",
] as const

function isKnownAppId(value: string): value is AppIdLiteral {
  return (KNOWN_APP_IDS as readonly string[]).includes(value)
}

/**
 * Resolve or create the User for this email, then link the AuthAccount
 * and materialize the cross-app AuthIdentity DTO used by UIs.
 *
 * This is what "identity linking" MEANS on Matriz: logging in via OTP in
 * Hub after a previous Magic Link login in Spot yields the SAME User row.
 */
export async function resolveIdentityByEmail(input: {
  email: string
  provider: AuthProvider
  providerSubject?: string
  displayName?: string | null
}): Promise<AuthIdentity> {
  const db = getCoreDb()
  const users = makeUserRepo(db)
  const accounts = makeAuthAccountRepo(db)
  const access = makeTenantAccessRepo(db)

  const email = normalizeEmail(input.email)

  // 1. Upsert user by email — identity linking happens here.
  const user = await users.upsertByEmail({
    email,
    displayName: input.displayName ?? undefined,
  })

  // 2. Link/upsert the auth account for this provider.
  //    For OTP/Magic Link, providerSubject defaults to the email itself.
  await accounts.linkToUser({
    userId: user.id,
    provider: input.provider,
    providerSubject: input.providerSubject ?? email,
    email,
    emailVerifiedAt: new Date(),
  })

  // 3. Load memberships → hydrate the cross-app AuthIdentity DTO.
  const rows = await access.listForUser(user.id)

  // Group memberships by tenant to compute enabledApps[].
  const byTenant = new Map<
    string,
    { tenantId: string; tenantName: string; roles: Set<string>; apps: Set<string> }
  >()
  for (const row of rows) {
    const key = row.tenantId
    const entry = byTenant.get(key) ?? {
      tenantId: row.tenantId,
      tenantName: row.tenant.name,
      roles: new Set<string>(),
      apps: new Set<string>(),
    }
    row.tenantRoles.forEach((role) => entry.roles.add(role.toLowerCase()))
    row.appGrants.forEach((grant) => entry.apps.add(grant.appId))
    byTenant.set(key, entry)
  }

  return {
    user: {
      id: asUserId(user.id),
      name: user.displayName,
      email: user.email,
    },
    tenants: Array.from(byTenant.values()).map((t) => ({
      tenantId: asTenantId(t.tenantId),
      tenantName: t.tenantName,
      roles: Array.from(t.roles),
      enabledApps: Array.from(t.apps)
        .filter(isKnownAppId)
        .map((a) => asAppId(a)),
    })),
  }
}
