import { apiError, assertSameOrigin } from "../../../../../src/application/http"
import { getTerminalSupervisor } from "../../../../../src/application/terminal-supervisor"

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) { const { sessionId } = await context.params; const session = getTerminalSupervisor().get(sessionId); return session ? Response.json(session) : Response.json({ error: "Unknown session" }, { status: 404 }) }
export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) { try { assertSameOrigin(request); const { sessionId } = await context.params; await getTerminalSupervisor().stop(sessionId); return Response.json(getTerminalSupervisor().get(sessionId)) } catch (error) { return apiError(error) } }
export async function DELETE(request: Request, context: { params: Promise<{ sessionId: string }> }) { try { assertSameOrigin(request); const { sessionId } = await context.params; getTerminalSupervisor().close(sessionId); return new Response(null, { status: 204 }) } catch (error) { return apiError(error) } }
