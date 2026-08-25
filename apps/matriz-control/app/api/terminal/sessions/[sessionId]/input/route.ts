import { apiError, assertSameOrigin, parseTerminalInput } from "../../../../../../src/application/http"
import { getTerminalSupervisor } from "../../../../../../src/application/terminal-supervisor"

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) { try { assertSameOrigin(request); const { sessionId } = await context.params; getTerminalSupervisor().write(sessionId, parseTerminalInput(await request.json())); return new Response(null, { status: 204 }) } catch (error) { return apiError(error) } }
