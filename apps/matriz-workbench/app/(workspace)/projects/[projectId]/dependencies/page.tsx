import { notFound } from "next/navigation"
import { CodexRunStore } from "../../../../../src/integration/codex/codex-run-store"
import { DeliveryArtifactStore } from "../../../../../src/integration/collaboration/delivery-artifact-store"
import { DeliveryReceiptStore } from "../../../../../src/integration/collaboration/delivery-receipt-store"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { WorkItemDependencies } from "../../../../../src/ui/components/work-item-dependencies"
import { toDeliveryEvidenceViewModel } from "../../../../../src/ui/presenters/delivery-evidence-presenter"
import { toWorkItemDependencyMapViewModel } from "../../../../../src/ui/presenters/work-item-dependency-presenter"
import { toWorkItemInspectorViewModel } from "../../../../../src/ui/presenters/work-item-board-presenter"
import { toProjectNavViewModel } from "../../../../../src/ui/presenters/workspace-presenters"

export default async function DependenciesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ item?: string }>
}) {
  const { projectId } = await params
  const filters = await searchParams
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()

  const [items, requests, projects] = await Promise.all([
    repository.listWorkItems(projectId),
    repository.listAgentRequests(projectId),
    repository.discoverProjects(),
  ])
  const selectedItem = filters.item ? items.find((item) => item.id === filters.item) : undefined

  let selected
  if (selectedItem) {
    const relatedRequests = requests.filter((request) => request.backlogItemId === selectedItem.id)
    const runStore = new CodexRunStore(repository.repositoryRoot)
    const artifactStore = new DeliveryArtifactStore(repository.repositoryRoot)
    const [runs, receipt, pullRequests, previews, history] = await Promise.all([
      Promise.all(relatedRequests.map((request) => runStore.read(projectId, request.id))),
      new DeliveryReceiptStore(repository.repositoryRoot).read(projectId, selectedItem.id),
      Promise.all(relatedRequests.map((request) => artifactStore.readPullRequest(projectId, request.id))),
      Promise.all(relatedRequests.map((request) => artifactStore.readPreview(projectId, request.id))),
      repository.queryActivity(projectId, { entityId: selectedItem.id, limit: 100 }),
    ])
    selected = toWorkItemInspectorViewModel(
      selectedItem,
      relatedRequests,
      history,
      toDeliveryEvidenceViewModel(relatedRequests, runs, receipt, pullRequests, previews),
    )
  }

  return (
    <WorkItemDependencies
      dependencyMap={toWorkItemDependencyMapViewModel(items)}
      projectId={projectId}
      projectName={project.workspace.displayName}
      projects={projects.map(toProjectNavViewModel)}
      selected={selected}
    />
  )
}
