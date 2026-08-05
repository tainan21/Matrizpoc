import { notFound } from "next/navigation"
import { DeliveryArtifactStore } from "../../../../../../src/integration/collaboration/delivery-artifact-store"
import { DeliveryReceiptStore } from "../../../../../../src/integration/collaboration/delivery-receipt-store"
import { CodexRunStore } from "../../../../../../src/integration/codex/codex-run-store"
import { WorkspaceRepository } from "../../../../../../src/integration/filesystem/workspace-repository"
import { WorkItemDetail } from "../../../../../../src/ui/components/work-item-detail"
import { toDeliveryEvidenceViewModel } from "../../../../../../src/ui/presenters/delivery-evidence-presenter"
import { toWorkItemDetailViewModel } from "../../../../../../src/ui/presenters/work-item-detail-presenter"

export const dynamic = "force-dynamic"

export default async function WorkItemDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; itemId: string }>
}) {
  const { projectId, itemId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const item = await repository.getWorkItem(projectId, itemId).catch(() => undefined)
  if (!item) notFound()

  const [allItems, allRequests, itemHistory] = await Promise.all([
    repository.listWorkItems(projectId),
    repository.listAgentRequests(projectId),
    repository.queryActivity(projectId, { entityId: itemId, limit: 150 }),
  ])
  const requests = allRequests.filter((request) => request.backlogItemId === itemId)
  const runStore = new CodexRunStore(repository.repositoryRoot)
  const artifactStore = new DeliveryArtifactStore(repository.repositoryRoot)
  const [runs, receipt, pullRequests, previews, requestHistoryGroups] = await Promise.all([
    Promise.all(requests.map((request) => runStore.read(projectId, request.id))),
    new DeliveryReceiptStore(repository.repositoryRoot).read(projectId, itemId),
    Promise.all(requests.map((request) => artifactStore.readPullRequest(projectId, request.id))),
    Promise.all(requests.map((request) => artifactStore.readPreview(projectId, request.id))),
    Promise.all(requests.map((request) => repository.queryActivity(projectId, { entityId: request.id, limit: 100 }))),
  ])
  const evidence = toDeliveryEvidenceViewModel(requests, runs, receipt, pullRequests, previews)

  return (
    <WorkItemDetail
      item={toWorkItemDetailViewModel(
        item,
        allItems,
        requests,
        runs,
        itemHistory,
        requestHistoryGroups.flat(),
        evidence,
      )}
      projectId={projectId}
    />
  )
}
