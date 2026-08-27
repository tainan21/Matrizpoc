import { WorkspaceError } from "../domain/errors"
import {
  controlDiagnosticSchema,
  type ControlDiagnosticInput,
} from "../integration/control/control-contract"

const maxBodyBytes = 24 * 1024
const noStore = { "Cache-Control": "no-store" }

interface DiagnosticIngestor {
  ingest(input: ControlDiagnosticInput): Promise<{
    diagnostic: { id: string; state: string; occurrences: number }
  }>
}

function error(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: noStore })
}

export async function handleControlDiagnosticPost(
  request: Request,
  service: DiagnosticIngestor,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    return error(413, "Diagnostic body is too large.")
  }
  try {
    const source = await request.text()
    if (Buffer.byteLength(source, "utf8") > maxBodyBytes) {
      return error(413, "Diagnostic body is too large.")
    }
    let raw: unknown
    try { raw = JSON.parse(source) } catch { return error(400, "Invalid diagnostic.") }
    const parsed = controlDiagnosticSchema.safeParse(raw)
    if (!parsed.success) return error(400, "Invalid diagnostic.")
    const result = await service.ingest(parsed.data)
    return Response.json({
      diagnosticId: result.diagnostic.id,
      state: result.diagnostic.state,
      occurrences: result.diagnostic.occurrences,
    }, { status: 202, headers: noStore })
  } catch (cause) {
    if (cause instanceof WorkspaceError) {
      if (cause.code === "CONFLICT") return error(409, "Diagnostic conflict.")
      if (cause.code === "RATE_LIMITED") return error(429, "Diagnostic rate limited.")
      if (cause.code === "INVALID_DATA" || cause.code === "INVALID_PATH") {
        return error(400, "Invalid diagnostic.")
      }
    }
    return error(500, "Diagnostic could not be accepted.")
  }
}
