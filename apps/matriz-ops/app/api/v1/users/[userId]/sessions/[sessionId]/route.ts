import { z } from "zod"
import { getCoreDb } from "@matriz/platform-db/core"
import { opsErrorResponse, runOpsMutation } from "../../../../../../../src/server/ops-action"
const schema = z.object({ reason: z.string().trim().min(8).max(500), confirmation: z.literal("CONFIRMAR"), correlationId: z.string().min(8).max(128).optional() })
export async function DELETE(request: Request, context: { params: Promise<{ userId: string; sessionId: string }> }) {
  try {
    const { userId, sessionId } = await context.params; const body = schema.parse(await request.json())
    const result = await runOpsMutation({ request, body, action: "users.manage", targetType: "session", targetId: sessionId, mutate: async () => {
      const before = await getCoreDb().appSession.findFirst({ where: { id: sessionId, userId } }); if (!before) throw new Error("SESSION_NOT_FOUND")
      const after = await getCoreDb().appSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
      return { before, after, result: { id: after.id, revokedAt: after.revokedAt?.toISOString() } }
    } })
    return Response.json({ contractVersion: "v1", session: result })
  } catch (error) { return opsErrorResponse(error) }
}
