export type PlatformOperatorRole = "OWNER" | "OPERATOR" | "AUDITOR"
export type OpsAction =
  | "users.read"
  | "users.manage"
  | "platforms.read"
  | "telemetry.read"
  | "audit.read"
  | "wallet.read"
  | "wallet.adjust"
  | "finance.read"

export class OpsAuthorizationError extends Error {
  readonly code = "OPS_FORBIDDEN"
}

const permissions: Readonly<Record<PlatformOperatorRole, readonly OpsAction[]>> = {
  OWNER: ["users.read", "users.manage", "platforms.read", "telemetry.read", "audit.read", "wallet.read", "wallet.adjust", "finance.read"],
  OPERATOR: ["users.read", "users.manage", "platforms.read", "telemetry.read", "audit.read", "wallet.read", "finance.read"],
  AUDITOR: ["users.read", "platforms.read", "telemetry.read", "audit.read", "wallet.read", "finance.read"],
}

const mutationActions = new Set<OpsAction>(["users.manage", "wallet.adjust"])

export interface OpsAuthorizationInput {
  readonly role: PlatformOperatorRole
  readonly action: OpsAction
  readonly reason?: string
  readonly confirmation?: string
  readonly sessionAuthenticatedAt?: Date
  readonly otpVerifiedAt?: Date
}

function ageInMinutes(value: Date | undefined, now: Date): number {
  if (!value) return Number.POSITIVE_INFINITY
  return (now.getTime() - value.getTime()) / 60_000
}

export function authorizeOpsAction(input: OpsAuthorizationInput, now = new Date()): true {
  if (!permissions[input.role].includes(input.action)) {
    throw new OpsAuthorizationError(`${input.role} cannot perform ${input.action}`)
  }
  if (!mutationActions.has(input.action)) return true
  if (!input.reason || input.reason.trim().length < 8) throw new OpsAuthorizationError("A meaningful reason is required")
  if (input.confirmation !== "CONFIRMAR") throw new OpsAuthorizationError("Typed confirmation is required")
  if (ageInMinutes(input.sessionAuthenticatedAt, now) > 15) throw new OpsAuthorizationError("A recent session is required")
  if (ageInMinutes(input.otpVerifiedAt, now) > 5) throw new OpsAuthorizationError("A recent OTP verification is required")
  return true
}

export interface AnonymizationObligations {
  readonly brlBalanceMinor: bigint
  readonly pendingFinancialOperations: number
  readonly openDisputes: number
  readonly auditHold: boolean
}

export type AnonymizationBlocker = "BRL_BALANCE" | "PENDING_FINANCIAL_OPERATION" | "OPEN_DISPUTE" | "AUDIT_HOLD"

export function canAnonymizeUser(input: AnonymizationObligations): {
  readonly allowed: boolean
  readonly blockers: readonly AnonymizationBlocker[]
} {
  const blockers: AnonymizationBlocker[] = []
  if (input.brlBalanceMinor !== 0n) blockers.push("BRL_BALANCE")
  if (input.pendingFinancialOperations > 0) blockers.push("PENDING_FINANCIAL_OPERATION")
  if (input.openDisputes > 0) blockers.push("OPEN_DISPUTE")
  if (input.auditHold) blockers.push("AUDIT_HOLD")
  return { allowed: blockers.length === 0, blockers }
}

const sensitiveKeys = new Set(["email", "displayname", "name", "token", "cookie", "password", "secret", "authorization", "body", "pixkey"])

export function sanitizeAuditSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditSnapshot)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    sensitiveKeys.has(key.toLowerCase()) ? "[REDACTED]" : sanitizeAuditSnapshot(item),
  ]))
}
