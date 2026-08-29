/**
 * POST /api/institutional/refresh
 *
 * Re-executa a ingestao institucional (local_contract_import + snapshot_pull).
 * Faz swap atomico do InstitutionalRegistry global e devolve um report resumido.
 *
 * Prova automatica da Fase 5: a partir da UI do Hub, um botao aciona este
 * endpoint e o usuario ve a pagina rerenderizada com dados novos (incluindo
 * `replacedAt`), sem nenhum toque em arquivos.
 */
import { NextResponse } from "next/server"
import {
  getHubTelemetry,
  runInstitutionalIngestion,
} from "../../../../src/bootstrap"
import { asTenantId } from "@matriz/foundation-types"
import { allowHubRequest, getDurableHubRequestContext, requireSameOrigin, HubAuthError } from "../../../../src/auth/hub-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireSameOrigin(request)
    const context = await getDurableHubRequestContext(request)
    if (!allowHubRequest(`institutional:refresh:${context.session.identity.user.id}`, Date.now(), 5)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "cache-control": "private, no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof HubAuthError && error.status === 403 ? "Access denied" : "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } })
  }
  const startedAt = Date.now()
  const report = await runInstitutionalIngestion()

  // Telemetria institucional: emite envelope categorizado
  const t = getHubTelemetry()
  t.track({
    tenantId: asTenantId("matriz-holding"),
    type: "institutional.ingestion.completed",
    properties: {
      accepted: report.accepted,
      rejected: report.rejected.length,
      adapters: report.run.byAdapter.length,
      durationMs: Date.now() - startedAt,
    },
    category: "institutional",
  })

  return NextResponse.json({
    ok: true,
    replacedAt: report.replacedAt,
    accepted: report.accepted,
    rejected: report.rejected,
    adapters: report.run.byAdapter.map((a) => ({
      adapterId: a.adapterId,
      accepted: a.projects.length,
      failed: a.errors.length,
      durationMs: a.durationMs,
    })),
  }, { headers: { "cache-control": "private, no-store" } })
}
