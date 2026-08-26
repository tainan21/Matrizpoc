import { ControlRepairQueue } from "../../../../../../src/application/control-diagnostic-service"
import { handleControlRepairResult } from "../../../../../../src/application/control-repair-http"
import { authorizeControlRequest } from "../../../../../../src/integration/control/capability-auth"
import { ControlDiagnosticRepository } from "../../../../../../src/integration/filesystem/control-diagnostic-repository"
import { WorkspaceRepository } from "../../../../../../src/integration/filesystem/workspace-repository"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ diagnosticId: string }> },
): Promise<Response> {
  const denied = authorizeControlRequest(request)
  if (denied) return denied
  const [{ diagnosticId }, workspace] = await Promise.all([params, WorkspaceRepository.create()])
  return handleControlRepairResult(
    request,
    diagnosticId,
    new ControlRepairQueue(new ControlDiagnosticRepository(workspace.repositoryRoot)),
  )
}
