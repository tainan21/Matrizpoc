import {
  AutomatedRepairCoordinator,
  resetBlockedDiagnostic,
} from "../../../../../../src/application/control-diagnostic-service"
import { getCodexRunManager } from "../../../../../../src/application/codex-run-manager"
import { authorizeControlRequest } from "../../../../../../src/integration/control/capability-auth"
import { ControlDiagnosticRepository } from "../../../../../../src/integration/filesystem/control-diagnostic-repository"
import { WorkspaceRepository } from "../../../../../../src/integration/filesystem/workspace-repository"
import { GitObservationProvider } from "../../../../../../src/integration/git/git-observation-provider"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ diagnosticId: string }> },
): Promise<Response> {
  const denied = authorizeControlRequest(request)
  if (denied) return denied
  try {
    const [{ diagnosticId }, workspace] = await Promise.all([params, WorkspaceRepository.create()])
    const diagnostics = new ControlDiagnosticRepository(workspace.repositoryRoot)
    const reset = await resetBlockedDiagnostic(diagnostics, diagnosticId)
    const repairs = new AutomatedRepairCoordinator(
      diagnostics,
      workspace,
      new GitObservationProvider(workspace.repositoryRoot),
      getCodexRunManager(),
    )
    queueMicrotask(() => { void repairs.start(reset.projectId, reset.fingerprint).catch(() => undefined) })
    return Response.json({
      diagnosticId: reset.id,
      state: reset.state,
      attempt: reset.repairAttempts,
    }, { status: 202, headers: { "Cache-Control": "no-store" } })
  } catch {
    return Response.json(
      { error: "Diagnostic retry unavailable." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    )
  }
}
