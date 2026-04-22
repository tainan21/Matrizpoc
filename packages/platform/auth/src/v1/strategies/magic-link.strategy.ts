/**
 * Mock Magic Link strategy for the V1 POC. `start` returns a one-shot
 * token (in production this token is mailed and the user clicks a link
 * that hits `/auth/callback?token=...`). For the POC we expose the token
 * directly so the UI can echo it back for the tester.
 */
import { asTenantId, asUserId, asAppId } from "@matriz/foundation-types"
import type { AppId } from "@matriz/foundation-types"
import type { AuthIdentity } from "../types"
import { authErr, authOk } from "../types"
import type {
  MagicLinkStartInput,
  MagicLinkStartOutput,
  MagicLinkStrategy,
  MagicLinkVerifyInput,
} from "./strategy.types"

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes

export interface MagicLinkStrategyOptions {
  readonly ttlMs?: number
  readonly enabledAppsPerTenant?: readonly AppId[]
}

export function createMagicLinkStrategy(
  options: MagicLinkStrategyOptions = {},
): MagicLinkStrategy {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const defaultEnabledApps: readonly AppId[] =
    options.enabledAppsPerTenant ??
    (["matriz-hub", "spot", "seumei", "contracts", "willdash"] as const).map((a) =>
      asAppId(a),
    )

  const pending = new Map<
    string,
    { readonly email: string; readonly expiresAt: number }
  >()

  async function start(input: MagicLinkStartInput) {
    if (!isEmail(input.email)) {
      return authErr<MagicLinkStartOutput>({
        code: "invalid-input",
        message: "E-mail invalido.",
      })
    }
    const token = generateToken()
    const expiresAt = Date.now() + ttlMs
    pending.set(token, { email: input.email, expiresAt })
    return authOk({
      email: input.email,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    })
  }

  async function verify(input: MagicLinkVerifyInput) {
    const record = pending.get(input.token)
    if (!record) {
      return authErr<AuthIdentity>({
        code: "invalid-credentials",
        message: "Token invalido ou ja consumido.",
      })
    }
    if (Date.now() > record.expiresAt) {
      pending.delete(input.token)
      return authErr<AuthIdentity>({
        code: "session-expired",
        message: "Link expirou. Solicite um novo.",
      })
    }
    pending.delete(input.token)

    const identity: AuthIdentity = {
      user: {
        id: asUserId(`user_${hash(record.email)}`),
        name: nameFromEmail(record.email),
        email: record.email,
      },
      tenants: [
        {
          tenantId: asTenantId("tenant_demo"),
          tenantName: "Demo Studio",
          roles: ["owner"],
          enabledApps: defaultEnabledApps,
        },
      ],
    }
    return authOk(identity)
  }

  return {
    id: "magic-link",
    label: "Link magico",
    description: "Enviamos um link de acesso direto para o seu e-mail.",
    start,
    verify,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Matriz"
  return local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join(" ") || "Matriz"
}

function hash(value: string): string {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

function generateToken(): string {
  return `mlk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
