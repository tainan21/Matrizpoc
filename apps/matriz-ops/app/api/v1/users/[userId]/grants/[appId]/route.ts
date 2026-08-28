import { z } from "zod"
import { getCoreDb } from "@matriz/platform-db/core"
import { opsErrorResponse, runOpsMutation } from "../../../../../../../src/server/ops-action"

const schema = z.object({
  tenantId: z.string().min(1), enabled: z.boolean(), appRoles: z.array(z.string().min(1)).max(20).default([]), capabilities: z.array(z.string().min(1)).max(100).default([]),
  reason: z.string().trim().min(8).max(500), confirmation: z.literal("CONFIRMAR"), correlationId: z.string().min(8).max(128).optional(),
})

export async function PUT(request: Request, context: { params: Promise<{ userId: string; appId: string }> }) {
  try {
    const { userId, appId } = await context.params
    const body = schema.parse(await request.json())
    const result = await runOpsMutation({ request, body, action: "users.manage", targetType: "app-grant", targetId: `${userId}:${body.tenantId}:${appId}`, mutate: async (actorUserId) => {
      const membership = await getCoreDb().tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: body.tenantId, userId } } })
      if (!membership || membership.revokedAt) throw new Error("ACTIVE_MEMBERSHIP_REQUIRED")
      const key = { tenantId_membershipId_appId: { tenantId: body.tenantId, membershipId: membership.id, appId } }
      const before = await getCoreDb().appGrant.findUnique({ where: key })
      const after = await getCoreDb().appGrant.upsert({ where: key, create: { tenantId: body.tenantId, membershipId: membership.id, appId, appRoles: body.appRoles, capabilities: body.capabilities, grantedByUserId: actorUserId, revokedAt: body.enabled ? null : new Date(), revokedByUserId: body.enabled ? null : actorUserId, revocationReason: body.enabled ? null : body.reason }, update: { appRoles: body.appRoles, capabilities: body.capabilities, grantedAt: body.enabled ? new Date() : undefined, grantedByUserId: body.enabled ? actorUserId : undefined, revokedAt: body.enabled ? null : new Date(), revokedByUserId: body.enabled ? null : actorUserId, revocationReason: body.enabled ? null : body.reason } })
      return { before, after, result: after }
    } })
    return Response.json({ contractVersion: "v1", grant: result })
  } catch (error) { return opsErrorResponse(error) }
}
