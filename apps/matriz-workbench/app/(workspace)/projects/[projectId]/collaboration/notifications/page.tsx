import Link from "next/link"
import { notFound } from "next/navigation"
import { NotificationOutboxStore } from "@/src/integration/collaboration/notification-outbox-store"
import { WorkspaceRepository } from "@/src/integration/filesystem/workspace-repository"
import { NotificationCenter } from "@/src/ui/components/notification-center"
import { ProjectHeader } from "@/src/ui/components/project-header"

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const store = new NotificationOutboxStore(repository.repositoryRoot)
  const [config, items] = await Promise.all([store.getConfig(projectId), store.list(projectId)])

  return (
    <main className="workspace-page">
      <ProjectHeader
        projectId={projectId}
        name={project.workspace.displayName}
        description="Fila local de eventos; provedores continuam opcionais e desacoplados."
      />
      <div className="page-content">
        <Link href={`/projects/${projectId}/collaboration`}>← Voltar para colaborar</Link>
        <NotificationCenter projectId={projectId} initialConfig={config} initialItems={items} />
      </div>
    </main>
  )
}
