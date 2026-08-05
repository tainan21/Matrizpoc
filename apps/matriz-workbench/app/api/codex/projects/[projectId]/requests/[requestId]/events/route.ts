import { type NextRequest } from "next/server"
import { getCodexRunManager } from "../../../../../../../../src/application/codex-run-manager"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function event(data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> },
) {
  const denied = await authorizeApiRequest(request)
  if (denied) return denied
  try {
    const { projectId, requestId } = await params
    const manager = getCodexRunManager()
    const initial = await manager.getSnapshot(projectId, requestId)
    let unsubscribe: () => void = () => undefined
    let heartbeat: NodeJS.Timeout | undefined
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (initial) controller.enqueue(event(initial))
        if (!initial?.connected) {
          controller.close()
          return
        }
        unsubscribe = manager.subscribe(projectId, requestId, (snapshot) => {
          controller.enqueue(event(snapshot))
          if (!snapshot.connected) {
            unsubscribe()
            if (heartbeat) clearInterval(heartbeat)
            controller.close()
          }
        })
        heartbeat = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"))
        }, 15_000)
      },
      cancel() {
        unsubscribe()
        if (heartbeat) clearInterval(heartbeat)
      },
    })
    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream; charset=utf-8",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
