import Link from "next/link"
import { notFound } from "next/navigation"
import { getCodexRunManager } from "../../../../../../src/application/codex-run-manager"
import { DeliveryArtifactStore } from "../../../../../../src/integration/collaboration/delivery-artifact-store"
import { WorkspaceRepository } from "../../../../../../src/integration/filesystem/workspace-repository"
import { CodexRunPanel } from "../../../../../../src/ui/components/codex-run-panel"
import { DeliveryArtifactsPanel } from "../../../../../../src/ui/components/delivery-artifacts-panel"
import { ExecutionReviewPanel } from "../../../../../../src/ui/components/execution-review-panel"
import { ProjectHeader } from "../../../../../../src/ui/components/project-header"
import {
  toCodexRuntimeViewModel,
  toCodexRunViewModel,
} from "../../../../../../src/ui/presenters/codex-run-presenter"
import {
  toPreviewReceiptViewModel,
  toPullRequestReceiptViewModel,
} from "../../../../../../src/ui/presenters/delivery-artifact-presenter"
import { toExecutionReviewViewModel } from "../../../../../../src/ui/presenters/work-item-detail-presenter"

export const dynamic = "force-dynamic"

export default async function AgentRequestPage({
  params,
}: {
  params: Promise<{ projectId: string; requestId: string }>
}) {
  const { projectId, requestId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const request = await repository.getAgentRequest(projectId, requestId).catch(() => undefined)
  if (!request) notFound()
  const workItem = await repository.getWorkItem(projectId, request.backlogItemId).catch(() => undefined)
  const manager = getCodexRunManager()
  const artifactStore = new DeliveryArtifactStore(repository.repositoryRoot)
  const [run, runtime, pullRequest, preview] = await Promise.all([
    manager.getSnapshot(projectId, requestId),
    manager.runtimeInfo(),
    artifactStore.readPullRequest(projectId, requestId),
    artifactStore.readPreview(projectId, requestId),
  ])

  return (
    <main className="workspace-page">
      <ProjectHeader
        projectId={projectId}
        name={request.title}
        description={`${request.id} · ${request.status.replace("_", " ")}`}
      />
      <div className="agent-detail-toolbar">
        <Link href={`/projects/${projectId}/agents`}>← Voltar para agentes</Link>
        {workItem ? (
          <Link href={`/projects/${projectId}/backlog/${workItem.id}`}>
            Produto: {workItem.title}
          </Link>
        ) : (
          <span>tarefa <code>{request.backlogItemId}</code></span>
        )}
      </div>
      <CodexRunPanel
        projectId={projectId}
        requestId={requestId}
        requestRevision={request.revision}
        requestStatus={request.status}
        runtime={toCodexRuntimeViewModel(runtime)}
        initialRun={toCodexRunViewModel(run)}
      />
      <DeliveryArtifactsPanel
        projectId={projectId}
        requestId={requestId}
        requestStatus={request.status}
        checks={request.checks}
        initialPullRequest={toPullRequestReceiptViewModel(pullRequest)}
        initialPreview={toPreviewReceiptViewModel(preview)}
      />
      <ExecutionReviewPanel
        execution={toExecutionReviewViewModel(request, run)}
        projectId={projectId}
      />
    </main>
  )
}
