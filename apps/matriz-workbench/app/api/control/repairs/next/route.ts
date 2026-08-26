import { ControlRepairQueue } from "../../../../../src/application/control-diagnostic-service"
import { handleControlRepairNext } from "../../../../../src/application/control-repair-http"
import { authorizeControlRequest } from "../../../../../src/integration/control/capability-auth"
import { ControlDiagnosticRepository } from "../../../../../src/integration/filesystem/control-diagnostic-repository"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"

export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<Response> {
  const denied = authorizeControlRequest(request)
  if (denied) return denied
  const workspace = await WorkspaceRepository.create()
  return handleControlRepairNext(
    new ControlRepairQueue(new ControlDiagnosticRepository(workspace.repositoryRoot)),
  )
}
