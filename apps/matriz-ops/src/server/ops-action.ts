import { createHash, randomUUID } from "node:crypto"
import { getCoreDb } from "@matriz/platform-db/core"
import { getOpsDb } from "@matriz/platform-db/ops"
import { requireOpsRequestPrincipal, requireSameOrigin } from "./ops-session"
import { runSensitiveOperation, type MutationOutcome, type SensitiveRequest } from "../application/sensitive-operation"
import type { OpsAction, PlatformOperatorRole } from "../domain/operator-policy"

export interface SensitiveBody {
  readonly reason: string
  readonly confirmation: string
  readonly correlationId?: string
}

function ipHash(request: Request): string | undefined {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const salt = process.env.OPS_AUDIT_IP_SALT
  return raw && salt ? createHash("sha256").update(`${salt}:${raw}`).digest("hex") : undefined
}

export async function runOpsMutation<T>(input: {
  readonly request: Request
  readonly body: SensitiveBody
  readonly action: OpsAction
  readonly targetType: string
  readonly targetId: string
  readonly mutate: (actorUserId: string) => Promise<MutationOutcome<T>>
}): Promise<T> {
  requireSameOrigin(input.request)
  const principal = await requireOpsRequestPrincipal(input.request)
  const otp = await getCoreDb().authVerificationChallenge.findFirst({
    where: { email: principal.session.user.email, kind: "OTP", consumedAt: { not: null } },
    orderBy: { consumedAt: "desc" },
    select: { consumedAt: true },
  })
  const operation: SensitiveRequest = {
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.body.reason,
    confirmation: input.body.confirmation,
    correlationId: input.body.correlationId ?? randomUUID(),
    idempotencyKey: input.request.headers.get("idempotency-key") ?? undefined,
    sourceIpHash: ipHash(input.request),
  }
  return runSensitiveOperation<T>({
    actor: {
      userId: principal.session.userId,
      role: principal.operator.role as PlatformOperatorRole,
      sessionAuthenticatedAt: principal.session.issuedAt,
      otpVerifiedAt: otp?.consumedAt ?? undefined,
    },
    request: operation,
    readIdempotentResult: async () => {
      if (!operation.idempotencyKey) return { found: false as const }
      const existing = await getOpsDb().opsAuditEvent.findUnique({
        where: { actorUserId_idempotencyKey: { actorUserId: principal.session.userId, idempotencyKey: operation.idempotencyKey } },
      })
      if (!existing) return { found: false as const }
      if (existing.action !== operation.action || existing.targetType !== operation.targetType || existing.targetId !== operation.targetId) {
        throw new Error("IDEMPOTENCY_CONFLICT")
      }
      return { found: true as const, result: existing.afterJson as T }
    },
    mutate: () => input.mutate(principal.session.userId),
    writeAudit: async (event) => {
      await getOpsDb().opsAuditEvent.create({ data: {
        actorUserId: event.actorUserId,
        actorRole: event.actorRole,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        reason: event.reason,
        correlationId: event.correlationId,
        idempotencyKey: event.idempotencyKey,
        sourceIpHash: event.sourceIpHash,
        beforeJson: event.beforeJson as never,
        afterJson: event.afterJson as never,
      } })
    },
  })
}

export function opsErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "OPS_ERROR"
  if (message === "OPS_UNAUTHORIZED") return Response.json({ error: message }, { status: 401 })
  if (message === "OPS_CSRF") return Response.json({ error: message }, { status: 403 })
  if (message.includes("cannot perform") || message.includes("required") || message.includes("recent OTP") || message.includes("recent session")) {
    return Response.json({ error: "STEP_UP_REQUIRED", detail: message }, { status: 403 })
  }
  if (message === "USER_NOT_FOUND") return Response.json({ error: message }, { status: 404 })
  return Response.json({ error: message }, { status: 409 })
}
