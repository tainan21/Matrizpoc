import { handleUserStatusMutation } from "../../../../../../src/server/status-route"
export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) { return handleUserStatusMutation(request, (await context.params).userId, "suspend") }
