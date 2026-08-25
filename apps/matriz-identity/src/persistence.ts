import { PrismaClient, type Prisma } from "../../../node_modules/.prisma/core/index.js"
import { createHash } from "node:crypto"
import { withTenantContext } from "@matriz/platform-db/tenant-context"

import type { AccessRepository, ActiveAccess } from "./authorization.js"
import type { SqlExecutor } from "./neon-adapter.js"

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
