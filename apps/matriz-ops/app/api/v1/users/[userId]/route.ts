import { z } from "zod"
import { getCoreDb } from "@matriz/platform-db/core"
import { getUserDirectoryEntry } from "../../../../../src/application/user-directory"
import { opsErrorResponse, runOpsMutation } from "../../../../../src/server/ops-action"
import { requireOpsRequestPrincipal } from "../../../../../src/server/ops-session"

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  locale: z.string().trim().min(2).max(20).nullable().optional(),
  timezone: z.string().trim().min(2).max(80).nullable().optional(),
  reason: z.string().trim().min(8).max(500),
  confirmation: z.literal("CONFIRMAR"),
  correlationId: z.string().min(8).max(128).optional(),
}).refine((value) => value.displayName !== undefined || value.avatarUrl !== undefined || value.locale !== undefined || value.timezone !== undefined, "No profile fields supplied")

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  try { await requireOpsRequestPrincipal(request) } catch { return Response.json({ error: "OPS_UNAUTHORIZED" }, { status: 401 }) }
  const { userId } = await context.params
  const user = await getUserDirectoryEntry(userId)
  return user ? Response.json({ contractVersion: "v1", user }) : Response.json({ error: "USER_NOT_FOUND" }, { status: 404 })
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params
    const body = patchSchema.parse(await request.json())
    const result = await runOpsMutation({ request, body, action: "users.manage", targetType: "user", targetId: userId, mutate: async () => {
      const before = await getCoreDb().user.findUnique({ where: { id: userId } })
      if (!before) throw new Error("USER_NOT_FOUND")
      const after = await getCoreDb().user.update({ where: { id: userId }, data: { displayName: body.displayName, avatarUrl: body.avatarUrl, locale: body.locale, timezone: body.timezone } })
      return { before, after, result: await getUserDirectoryEntry(userId) }
    } })
    return Response.json({ contractVersion: "v1", user: result })
  } catch (error) { return opsErrorResponse(error) }
}
