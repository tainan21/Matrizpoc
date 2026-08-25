import { apiError, assertSameOrigin, parseCreateSession } from "../../../../src/application/http"
import { getTerminalSupervisor } from "../../../../src/application/terminal-supervisor"

export const dynamic = "force-dynamic"
export async function GET() { return Response.json({ sessions: getTerminalSupervisor().list() }, { headers: { "Cache-Control": "no-store" } }) }
export async function POST(request: Request) {
  try { assertSameOrigin(request); const body = parseCreateSession(await request.json()); return Response.json(await getTerminalSupervisor().start(body.projectId, body.actionId), { status: 201 }) }
  catch (error) { return apiError(error) }
}
