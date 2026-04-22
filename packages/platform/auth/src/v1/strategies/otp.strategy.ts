/**
 * Mock OTP strategy for the V1 POC. Accepts any email. Returns a
 * deterministic 6-digit hint code so testers can proceed without an inbox.
 *
 * Replacing this with a real backend = implement the same interface and
 * wire it in the app's `src/auth/strategies.ts`. Zero impact on the UI.
 */
import { asTenantId, asUserId } from "@matriz/foundation-types"
import type { AppId } from "@matriz/foundation-types"
import { asAppId } from "@matriz/foundation-types"
import type { AuthIdentity } from "../types"
import { authErr, authOk } from "../types"
import type {
  OtpStartInput,
  OtpStartOutput,
  OtpStrategy,
  OtpVerifyInput,
} from "./strategy.types"

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MOCK_CODE = "123456"

export interface OtpStrategyOptions {
  /**
   * Fixed code that `verify` accepts. Defaults to `"123456"`.
   * Tests can override this for deterministic failure paths.
   */
  readonly mockCode?: string
  /** Seconds-based override used by tests. */
  readonly ttlMs?: number
  /** Apps the mock identity can access. Defaults to "all known apps". */
  readonly enabledAppsPerTenant?: readonly AppId[]
}

/**
 * Builds a fresh OTP strategy. Each instance owns its own in-memory store
 * of pending codes (namespaced by email). No cross-instance leakage.
 */
export function createOtpStrategy(options: OtpStrategyOptions = {}): OtpStrategy {
  const expected = options.mockCode ?? MOCK_CODE
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const defaultEnabledApps: readonly AppId[] =
    options.enabledAppsPerTenant ??
    (["matriz-hub", "spot", "seumei", "contracts", "willdash"] as const).map((a) =>
      asAppId(a),
    )

  const pending = new Map<string, { readonly code: string; readonly expiresAt: number }>()

  async function start(input: OtpStartInput) {
    if (!isEmail(input.email)) {
      return authErr<OtpStartOutput>({
        code: "invalid-input",
        message: "E-mail invalido.",
      })
    }
    const expiresAt = Date.now() + ttlMs
    pending.set(input.email.toLowerCase(), { code: expected, expiresAt })
    const output: OtpStartOutput = {
      email: input.email,
      hint: `Codigo mock: ${expected}`,
      expiresAt: new Date(expiresAt).toISOString(),
    }
    return authOk(output)
  }

  async function verify(input: OtpVerifyInput) {
    const key = input.email.toLowerCase()
    const record = pending.get(key)
    if (!record) {
      return authErr<AuthIdentity>({
        code: "invalid-credentials",
        message: "Nenhum codigo pendente para este e-mail.",
      })
    }
    if (Date.now() > record.expiresAt) {
      pending.delete(key)
      return authErr<AuthIdentity>({
        code: "session-expired",
        message: "Codigo expirou. Peca um novo.",
      })
    }
    if (input.code.trim() !== record.code) {
      return authErr<AuthIdentity>({
        code: "invalid-credentials",
        message: "Codigo incorreto.",
      })
    }
    pending.delete(key)

    const identity: AuthIdentity = {
      user: {
        id: asUserId(`user_${hash(input.email)}`),
        name: nameFromEmail(input.email),
        email: input.email,
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
    id: "otp",
    label: "Codigo por e-mail",
    description: "Enviamos um codigo de 6 digitos para o seu e-mail.",
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
