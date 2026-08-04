import type { MatrizAppId } from "@matriz/foundation-constants"
import { asAppId, asTenantId, asUserId } from "@matriz/foundation-types"
import type { AuthIdentity, AuthResult, AuthSession } from "../types"
import { authErr, authOk } from "../types"

export type AuthMethodId = "google" | "otp" | "magic-link" | "email"
export type ChallengeMethod = "otp" | "magic-link"

export interface MockGoogleAccount {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly avatarUrl?: string
}

export interface AuthChallenge {
  readonly id: string
  readonly method: ChallengeMethod
  readonly email: string
  readonly expiresAt: string
  readonly hint?: string
  readonly previewUrl?: string
}

export interface RecentAppAccess {
  readonly appId: MatrizAppId
  readonly openedAt: string
}

export interface SharedAuthSession {
  readonly session: AuthSession
  readonly recentApps: readonly RecentAppAccess[]
}

export interface MockAuthClock {
  now(): Date
  advance?(milliseconds: number): void
}

export const MOCK_GOOGLE_ACCOUNTS: readonly MockGoogleAccount[] = [
  { id: "google-ana", name: "Ana Matriz", email: "ana@matriz.com" },
  { id: "google-caio", name: "Caio Operacoes", email: "caio@matriz.com" },
]

const ENABLED_APPS = (["matriz-hub", "spot", "seumei", "contracts", "willdash"] as const).map((appId) => asAppId(appId))
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHALLENGE_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

interface PendingChallenge extends AuthChallenge {
  readonly secret: string
}

export interface MockAuthState {
  startChallenge(method: ChallengeMethod, email: string): AuthResult<AuthChallenge>
  verifyOtp(challengeId: string, code: string): AuthResult<AuthSession>
  verifyMagicLink(token: string): AuthResult<AuthSession>
  signInWithGoogle(accountId: string): AuthResult<AuthSession>
  signInWithEmail(email: string): AuthResult<AuthSession>
  restoreSession(): SharedAuthSession | null
  recordAppOpen(appId: MatrizAppId): void
  signOut(): void
}

export function createMockAuthState(options: { clock?: MockAuthClock } = {}): MockAuthState {
  const clock = options.clock ?? { now: () => new Date() }
  const challenges = new Map<string, PendingChallenge>()
  let current: AuthSession | null = null
  let recentApps: RecentAppAccess[] = []
  let sequence = 0

  function createIdentity(email: string, name?: string): AuthIdentity {
    return {
      user: { id: asUserId(`user_${stableHash(email)}`), name: name ?? nameFromEmail(email), email },
      tenants: [{
        tenantId: asTenantId("tenant_demo"),
        tenantName: "Matriz Demo",
        roles: ["owner"],
        enabledApps: ENABLED_APPS,
      }],
    }
  }

  function commit(identity: AuthIdentity, strategyId: AuthMethodId): AuthResult<AuthSession> {
    const issuedAt = clock.now()
    current = {
      identity,
      activeTenantId: identity.tenants[0]!.tenantId,
      strategyId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + SESSION_TTL_MS).toISOString(),
    }
    return authOk(current)
  }

  function validEmail(email: string): string | undefined {
    const normalized = email.trim().toLowerCase()
    return EMAIL_PATTERN.test(normalized) ? normalized : undefined
  }

  return {
    startChallenge(method, email) {
      const normalized = validEmail(email)
      if (!normalized) return authErr({ code: "invalid-input", message: "Informe um e-mail valido." })
      sequence += 1
      const id = `challenge_${clock.now().getTime().toString(36)}_${sequence}`
      const secret = method === "otp" ? "246810" : `mlk_${stableHash(`${id}:${normalized}`)}`
      const challenge: PendingChallenge = {
        id, method, email: normalized, secret,
        expiresAt: new Date(clock.now().getTime() + CHALLENGE_TTL_MS).toISOString(),
        ...(method === "otp" ? { hint: secret } : { previewUrl: `http://localhost:3000/login?magic_token=${encodeURIComponent(secret)}` }),
      }
      challenges.set(id, challenge)
      const { secret: _secret, ...publicChallenge } = challenge
      return authOk(publicChallenge)
    },
    verifyOtp(challengeId, code) {
      const challenge = challenges.get(challengeId)
      if (!challenge || challenge.method !== "otp" || challenge.secret !== code) {
        return authErr({ code: "invalid-credentials", message: "Codigo invalido." })
      }
      if (clock.now().getTime() > new Date(challenge.expiresAt).getTime()) {
        challenges.delete(challengeId)
        return authErr({ code: "session-expired", message: "Codigo expirado." })
      }
      challenges.delete(challengeId)
      return commit(createIdentity(challenge.email), "otp")
    },
    verifyMagicLink(token) {
      const challenge = [...challenges.values()].find((item) => item.method === "magic-link" && item.secret === token)
      if (!challenge) return authErr({ code: "invalid-credentials", message: "Link invalido ou ja utilizado." })
      if (clock.now().getTime() > new Date(challenge.expiresAt).getTime()) {
        challenges.delete(challenge.id)
        return authErr({ code: "session-expired", message: "Link expirado." })
      }
      challenges.delete(challenge.id)
      return commit(createIdentity(challenge.email), "magic-link")
    },
    signInWithGoogle(accountId) {
      const account = MOCK_GOOGLE_ACCOUNTS.find((item) => item.id === accountId)
      return account
        ? commit(createIdentity(account.email, account.name), "google")
        : authErr({ code: "invalid-credentials", message: "Conta Google mockada nao encontrada." })
    },
    signInWithEmail(email) {
      const normalized = validEmail(email)
      return normalized
        ? commit(createIdentity(normalized), "email")
        : authErr({ code: "invalid-input", message: "Informe um e-mail valido." })
    },
    restoreSession() {
      if (!current) return null
      if (clock.now().getTime() > new Date(current.expiresAt).getTime()) {
        current = null
        return null
      }
      return { session: current, recentApps }
    },
    recordAppOpen(appId) {
      if (!current) return
      recentApps = [
        { appId, openedAt: clock.now().toISOString() },
        ...recentApps.filter((item) => item.appId !== appId),
      ].slice(0, 7)
    },
    signOut() { current = null; recentApps = [] },
  }
}

function nameFromEmail(email: string): string {
  return email.split("@")[0]!.split(/[._-]/).filter(Boolean).map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" ") || "Pessoa Matriz"
}

function stableHash(value: string): string {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return Math.abs(hash).toString(36)
}
