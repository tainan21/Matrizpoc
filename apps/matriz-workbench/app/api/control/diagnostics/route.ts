import {
  AutomatedRepairCoordinator,
  ControlDiagnosticService,
} from "../../../../src/application/control-diagnostic-service"
import { getCodexRunManager } from "../../../../src/application/codex-run-manager"
import { handleControlDiagnosticPost } from "../../../../src/application/control-diagnostic-http"
import { authorizeControlRequest } from "../../../../src/integration/control/capability-auth"
import { ControlDiagnosticRepository } from "../../../../src/integration/filesystem/control-diagnostic-repository"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"
import { GitObservationProvider } from "../../../../src/integration/git/git-observation-provider"

export const dynamic = "force-dynamic"

let servicePromise: Promise<ControlDiagnosticService> | undefined

async function diagnosticService(): Promise<ControlDiagnosticService> {
  servicePromise ??= WorkspaceRepository.create().then((workspace) => {
    const diagnostics = new ControlDiagnosticRepository(workspace.repositoryRoot)
    const repairs = new AutomatedRepairCoordinator(
      diagnostics,
      workspace,
      new GitObservationProvider(workspace.repositoryRoot),
      getCodexRunManager(),
    )
    return new ControlDiagnosticService(
      diagnostics,
      (projectId, fingerprint) => repairs.start(projectId, fingerprint).then(() => undefined),
    )
  })
  return servicePromise
}

export async function POST(request: Request): Promise<Response> {
  const denied = authorizeControlRequest(request)
  if (denied) return denied
  return handleControlDiagnosticPost(request, await diagnosticService())
}
