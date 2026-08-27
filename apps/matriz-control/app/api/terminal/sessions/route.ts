import { apiError, assertSameOrigin, parseCreateSession } from "../../../../src/application/http"
import { getTerminalSupervisor } from "../../../../src/application/terminal-supervisor"
import { inspectManagedMemory } from "../../../../src/integration/system/system-inspector"

export const dynamic = "force-dynamic"
export async function GET() { const sessions=getTerminalSupervisor().list();const memory=await inspectManagedMemory(sessions);return Response.json({ sessions: sessions.map(session=>({...session,memoryBytes:memory.get(session.id)??null,validationLabel:"não executada"})) }, { headers: { "Cache-Control": "no-store" } }) }
export async function POST(request: Request) {
  try { assertSameOrigin(request); const body = parseCreateSession(await request.json()); return Response.json(await getTerminalSupervisor().start(body.projectId, body.actionId), { status: 201 }) }
  catch (error) { return apiError(error) }
}
