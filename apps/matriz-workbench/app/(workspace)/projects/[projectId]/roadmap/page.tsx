import { notFound } from "next/navigation"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { RoadmapTimeline } from "../../../../../src/ui/components/roadmap-timeline"
import {
  toRoadmapInspectorViewModel,
  toRoadmapTimelineViewModel,
} from "../../../../../src/ui/presenters/roadmap-timeline-presenter"
import { toProjectNavViewModel } from "../../../../../src/ui/presenters/workspace-presenters"

export default async function RoadmapPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ initiative?: string }>
}) {
  const { projectId } = await params
  const filters = await searchParams
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()

  const [roadmap, workItems, projects] = await Promise.all([
    repository.getRoadmap(projectId),
    repository.listWorkItems(projectId),
    repository.discoverProjects(),
  ])
  const timeline = toRoadmapTimelineViewModel(roadmap, workItems)
  const history = filters.initiative
    ? await repository.queryActivity(projectId, { entityId: filters.initiative, limit: 100 })
    : []
  const selected = filters.initiative
    ? toRoadmapInspectorViewModel(timeline, filters.initiative, history)
    : undefined

  return (
    <RoadmapTimeline
      initialTimeline={timeline}
      projectId={projectId}
      projectName={project.workspace.displayName}
      projects={projects.map(toProjectNavViewModel)}
      selected={selected}
    />
  )
}
