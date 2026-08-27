import { authorizeOpsAction, sanitizeAuditSnapshot, type OpsAction, type PlatformOperatorRole } from "../domain/operator-policy"

export interface SensitiveActor {
  readonly userId: string
  readonly role: PlatformOperatorRole
  readonly sessionAuthenticatedAt: Date
  readonly otpVerifiedAt?: Date
}

export interface SensitiveRequest {
  readonly action: OpsAction
  readonly targetType: string
  readonly targetId: string
  readonly reason: string
  readonly confirmation: string
  readonly correlationId: string
  readonly idempotencyKey?: string
  readonly sourceIpHash?: string
}

export interface MutationOutcome<T> {
  readonly before: unknown
  readonly after: unknown
  readonly result: T
}

export interface AuditWrite {
  readonly actorUserId: string
  readonly actorRole: PlatformOperatorRole
  readonly action: OpsAction
  readonly targetType: string
  readonly targetId: string
  readonly reason: string
  readonly correlationId: string
  readonly idempotencyKey?: string
  readonly sourceIpHash?: string
  readonly beforeJson: unknown
  readonly afterJson: unknown
}

export async function runSensitiveOperation<T>(input: {
  readonly actor: SensitiveActor
  readonly request: SensitiveRequest
  readonly readIdempotentResult?: () => Promise<{ readonly found: false } | { readonly found: true; readonly result: T }>
  readonly mutate: () => Promise<MutationOutcome<T>>
  readonly writeAudit: (event: AuditWrite) => Promise<void>
  readonly now?: Date
}): Promise<T> {
  authorizeOpsAction({
    role: input.actor.role,
    action: input.request.action,
    reason: input.request.reason,
    confirmation: input.request.confirmation,
    sessionAuthenticatedAt: input.actor.sessionAuthenticatedAt,
    otpVerifiedAt: input.actor.otpVerifiedAt,
  }, input.now)
  const replay = await input.readIdempotentResult?.()
  if (replay?.found) return replay.result
  const outcome = await input.mutate()
  await input.writeAudit({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    action: input.request.action,
    targetType: input.request.targetType,
    targetId: input.request.targetId,
    reason: input.request.reason,
    correlationId: input.request.correlationId,
    idempotencyKey: input.request.idempotencyKey,
    sourceIpHash: input.request.sourceIpHash,
    beforeJson: sanitizeAuditSnapshot(outcome.before),
    afterJson: sanitizeAuditSnapshot(outcome.after),
  })
  return outcome.result
}
