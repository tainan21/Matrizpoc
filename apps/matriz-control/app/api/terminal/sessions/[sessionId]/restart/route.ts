import { apiError, assertSameOrigin } from "../../../../../../src/application/http"
import { getTerminalSupervisor } from "../../../../../../src/application/terminal-supervisor"

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) { try { assertSameOrigin(request); const { sessionId } = await context.params; return Response.json(await getTerminalSupervisor().restart(sessionId)) } catch (error) { return apiError(error) } }
