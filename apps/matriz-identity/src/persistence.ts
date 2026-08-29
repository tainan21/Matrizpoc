import { PrismaClient, type Prisma } from "../../../node_modules/.prisma/core/index.js"
import { createHash, timingSafeEqual } from "node:crypto"
import { withTenantContext } from "@matriz/platform-db/tenant-context"

import type { AccessRepository, ActiveAccess } from "./authorization.js"
import type { SqlExecutor } from "./neon-adapter.js"
import type { AccessApiRepository } from "./access-api.js"
import type { MfaRuntimeRepository } from "./mfa-api.js"
import type { AppSessionVaultRepository } from "./app-session-vault.js"
import { consumeRecoveryCode, decryptTotpSecret, verifyAndConsumeTotp } from "./mfa.js"

export type OidcClientRegistration = {
  client_id: string
  redirect_uris: string[]
  post_logout_redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  token_endpoint_auth_method: string
  client_secret?: string
}

export type CorePrismaClient = PrismaClient

let identityDb: PrismaClient | undefined
export function getIdentityDb(): PrismaClient {
  if (identityDb) return identityDb
  const url = process.env.CORE_RUNTIME_DATABASE_URL
  if (!url) throw new Error("Missing CORE_RUNTIME_DATABASE_URL")
  identityDb = new PrismaClient({ datasources: { db: { url } }, log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"] })
  return identityDb
}

export function createSqlExecutor(client: CorePrismaClient): SqlExecutor {
  return {
    query: async <T extends Record<string, unknown>>(text: string, values: readonly unknown[] = []) => {
      const rows = await client.$queryRawUnsafe<T[]>(text, ...values)
      return { rows }
    },
  }
}

export function createAccessRepository(client: CorePrismaClient = getIdentityDb()): AccessRepository {
  return {
    async findAccess(input): Promise<ActiveAccess | null> {
      return withTenantContext(client, input.tenantId, async (transaction) => {
        const membership = await transaction.tenantMembership.findFirst({
          where: { tenantId: input.tenantId, userId: input.userId, revokedAt: null },
          include: { appGrants: { where: { appId: input.appId, revokedAt: null }, take: 1 } },
        })
        const grant = membership?.appGrants[0]
        if (!membership || !grant) return null
        return {
          userId: input.userId,
          tenantId: input.tenantId,
          membershipId: membership.id,
          tenantRoles: membership.tenantRoles,
          appId: input.appId,
          appRoles: grant.appRoles,
          capabilities: grant.capabilities,
        }
      })
    },
  }
}

export function createAccessApiRepository(client: CorePrismaClient = getIdentityDb()): AccessApiRepository {
  return {
    async findClientAppId(clientId) {
      const registration = await client.oidcClient.findFirst({ where: { clientId, enabled: true, revokedAt: null }, select: { appId: true } })
      return registration?.appId ?? null
    },
    async findEligibleTenants({ userId, appId }) {
      const memberships = await client.tenantMembership.findMany({
        where: { userId, revokedAt: null, appGrants: { some: { appId, revokedAt: null } } },
        include: { tenant: { select: { name: true } }, appGrants: { where: { appId, revokedAt: null }, take: 1 } },
      })
      return memberships.map((membership) => ({ tenantId: membership.tenantId, tenantName: membership.tenant.name, membershipId: membership.id, tenantRoles: membership.tenantRoles, appRoles: membership.appGrants[0]!.appRoles, capabilities: membership.appGrants[0]!.capabilities }))
    },
    async audit(event) {
      await client.identityAuditEvent.create({ data: { tenantId: event.tenantId, actorUserId: event.actorUserId, eventType: event.eventType, subjectType: "AppSession", subjectId: event.subjectId, metadata: event.metadata } })
    },
  }
}

export function createMfaRepository(client: CorePrismaClient = getIdentityDb()): MfaRuntimeRepository {
  return {
    async requiresMfa(userId) {
      return Boolean(await client.identityMfaMethod.findFirst({ where: { userId, verifiedAt: { not: null }, revokedAt: null }, select: { id: true } }))
    },
    async createTotp(input) {
      return client.identityMfaMethod.create({ data: { userId: input.userId, kind: "totp", secretCiphertext: input.secretCiphertext, transports: [] }, select: { id: true } })
    },
    async findTotp({ methodId, userId, verifiedOnly }) {
      return client.identityMfaMethod.findFirst({
        where: { id: methodId, userId, kind: "totp", revokedAt: null, secretCiphertext: { not: null }, ...(verifiedOnly ? { verifiedAt: { not: null } } : {}) },
        select: { id: true, userId: true, secretCiphertext: true, verifiedAt: true },
      }) as Promise<{ id: string; userId: string; secretCiphertext: string; verifiedAt: Date | null } | null>
    },
    async advanceCounter(methodId, counter) {
      const result = await client.identityMfaMethod.updateMany({ where: { id: methodId, revokedAt: null, OR: [{ lastTotpCounter: null }, { lastTotpCounter: { lt: counter } }] }, data: { lastTotpCounter: counter } })
      return result.count === 1
    },
    async markVerified(methodId, verifiedAt) {
      await client.identityMfaMethod.updateMany({ where: { id: methodId, verifiedAt: null, revokedAt: null }, data: { verifiedAt } })
    },
    async findActive(userId) {
      return client.identityRecoveryCode.findMany({ where: { userId, consumedAt: null }, select: { id: true, codeHash: true } })
    },
    async consume(id, consumedAt) {
      const result = await client.identityRecoveryCode.updateMany({ where: { id, consumedAt: null }, data: { consumedAt } })
      return result.count === 1
    },
    async audit(event) {
      await client.identityAuditEvent.create({ data: { actorUserId: event.actorUserId, eventType: event.eventType, subjectType: "IdentityMfaMethod", subjectId: event.subjectId } })
    },
  }
}

export function createAppSessionVaultRepository(client: CorePrismaClient = getIdentityDb()): AppSessionVaultRepository {
  return {
    async create(row) { await client.oidcAppSession.create({ data: row }) },
    async read(input) { return client.oidcAppSession.findFirst({ where: { ...input, expiresAt: { gt: new Date() } } }) },
    async rotate(previous, row) {
      return client.$transaction(async transaction => {
        const removed = await transaction.oidcAppSession.deleteMany({ where: previous })
        if (removed.count !== 1) return false
        await transaction.oidcAppSession.create({ data: row })
        return true
      })
    },
    async update(input, row) { return (await client.oidcAppSession.updateMany({ where: input, data: { ...row, revision: { increment: 1 } } })).count === 1 },
    async delete(input) { return (await client.oidcAppSession.deleteMany({ where: input })).count === 1 },
  }
}

export function createAppSessionClientAuthenticator(client: CorePrismaClient = getIdentityDb()) {
  return async (clientId: string, secret: string) => {
    const registration = await client.oidcClient.findFirst({ where: { clientId, enabled: true, revokedAt: null }, select: { clientId: true, appId: true, secretFingerprint: true, tokenEndpointAuthMethod: true } })
    if (!registration?.secretFingerprint || registration.tokenEndpointAuthMethod === "none") return null
    const actual = createHash("sha256").update(secret).digest("hex")
    if (actual.length !== registration.secretFingerprint.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(registration.secretFingerprint))) return null
    return { clientId: registration.clientId, appId: registration.appId }
  }
}

export function createInteractionMfaChallenge(encryptionKey: string, client: CorePrismaClient = getIdentityDb()) {
  const repository = createMfaRepository(client)
  return {
    async verifyTotp(userId: string, code: string) {
      const method = await client.identityMfaMethod.findFirst({ where: { userId, kind: "totp", verifiedAt: { not: null }, revokedAt: null, secretCiphertext: { not: null } }, select: { id: true, secretCiphertext: true } })
      if (!method?.secretCiphertext) return false
      const accepted = await verifyAndConsumeTotp(repository, { methodId: method.id, secret: decryptTotpSecret(method.secretCiphertext, encryptionKey), code })
      if (accepted) await repository.audit({ actorUserId: userId, eventType: "MFA_VERIFIED", subjectId: method.id })
      return accepted
    },
    async verifyRecovery(userId: string, code: string) { return consumeRecoveryCode(repository, { userId, code }) },
  }
}

export async function loadActiveClients(client: CorePrismaClient = getIdentityDb(), env: NodeJS.ProcessEnv = process.env): Promise<OidcClientRegistration[]> {
  const registrations = await client.oidcClient.findMany({ where: { enabled: true, revokedAt: null } })
  const normalizedSecretKeys = new Map<string, string>()
  return registrations.map((registration) => {
    let clientSecret: string | undefined
    if (registration.tokenEndpointAuthMethod !== "none") {
      const key = `OIDC_CLIENT_SECRET_${registration.clientId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`
      const collision = normalizedSecretKeys.get(key)
      if (collision && collision !== registration.clientId) throw new Error(`Confidential client secret environment key collision: ${collision}, ${registration.clientId}`)
      normalizedSecretKeys.set(key, registration.clientId)
      clientSecret = env[key]
      if (!clientSecret || Buffer.byteLength(clientSecret) < 32 || !registration.secretFingerprint) throw new Error(`Missing or weak secret material for confidential client ${registration.clientId}`)
      const fingerprint = createHash("sha256").update(clientSecret).digest("hex")
      if (fingerprint !== registration.secretFingerprint) throw new Error(`Secret fingerprint mismatch for confidential client ${registration.clientId}`)
    }
    return {
    client_id: registration.clientId,
    redirect_uris: registration.redirectUris.map(assertExactRedirectUri),
    post_logout_redirect_uris: registration.postLogoutRedirectUris.map(assertExactRedirectUri),
    grant_types: registration.grantTypes.filter((type) => type === "authorization_code" || type === "refresh_token"),
    response_types: registration.responseTypes.filter((type) => type === "code"),
    token_endpoint_auth_method: registration.tokenEndpointAuthMethod,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
    }
  })
}

export function assertExactRedirectUri(uri: string): string {
  const parsed = new URL(uri)
  if (parsed.hash || uri.includes("*")) throw new Error("OIDC redirect URIs must be exact and cannot contain fragments")
  if (parsed.username || parsed.password) throw new Error("OIDC redirect URIs cannot contain credentials")
  const loopbackHttp = parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]")
  if (parsed.protocol !== "https:" && !loopbackHttp) {
    throw new Error("OIDC redirect URIs must use https outside local development")
  }
  return parsed.toString()
}

export async function findAccountClaims(id: string, client: CorePrismaClient = getIdentityDb()) {
  const user = await client.user.findUnique({ where: { id } })
  if (!user) return undefined
  return {
    accountId: user.id,
    async claims() {
      const verified = await client.authAccount.findFirst({ where: { userId: user.id, emailVerifiedAt: { not: null } }, select: { id: true } })
      return { sub: user.id, email: user.email, email_verified: Boolean(verified), name: user.displayName, locale: user.locale, zoneinfo: user.timezone }
    },
  }
}
