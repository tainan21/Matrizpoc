import type { ControlDiagnostic } from "../domain/control-diagnostic"
import { WorkspaceError } from "../domain/errors"
import { controlRepairResultSchema, type ControlRepairResult } from "../integration/control/control-contract"

const noStore = { "Cache-Control": "no-store" }
const maxBodyBytes = 24 * 1024

interface RepairQueue {
  next(): Promise<{
    diagnosticId: string
    projectId: string
    actionId: "dev" | "lint" | "typecheck" | "test"
    attempt: number
    lease: string
  } | undefined>
  result?(diagnosticId: string, input: ControlRepairResult): Promise<ControlDiagnostic | { state: string }>
}

interface RepairResultWriter {
  result(diagnosticId: string, input: ControlRepairResult): Promise<ControlDiagnostic | { state: string }>
}

const error = (status: number, message: string) => Response.json(
  { error: message },
  { status, headers: noStore },
)

export async function handleControlRepairNext(queue: RepairQueue): Promise<Response> {
  try {
    const next = await queue.next()
    if (!next) return new Response(null, { status: 204, headers: noStore })
    return Response.json(next, { headers: noStore })
  } catch {
    return error(500, "Repair queue unavailable.")
  }
}

export async function handleControlRepairResult(
  request: Request,
  diagnosticId: string,
  queue: RepairResultWriter,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    return error(413, "Repair result is too large.")
  }
  try {
    const source = await request.text()
    if (Buffer.byteLength(source, "utf8") > maxBodyBytes) {
      return error(413, "Repair result is too large.")
    }
    let raw: unknown
    try { raw = JSON.parse(source) } catch { return error(400, "Invalid repair result.") }
    const parsed = controlRepairResultSchema.safeParse(raw)
    if (!parsed.success || !/^diag_[a-f0-9]{64}$/.test(diagnosticId)) {
      return error(400, "Invalid repair result.")
    }
    const diagnostic = await queue.result(diagnosticId, parsed.data)
    return Response.json({ diagnosticId, state: diagnostic.state }, { headers: noStore })
  } catch (cause) {
    if (cause instanceof WorkspaceError) {
      if (cause.code === "CONFLICT") return error(409, "Repair result conflict.")
      if (cause.code === "NOT_FOUND") return error(404, "Repair not found.")
    }
    return error(500, "Repair result could not be recorded.")
  }
}
