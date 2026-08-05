import Link from "next/link"
import { notFound } from "next/navigation"
import {
  buildGitHubIssueDraft,
  buildGitHubPluginHandoff,
} from "../../../../../../src/application/collaboration/github-issue-draft"
import { DeliveryReceiptStore } from "../../../../../../src/integration/collaboration/delivery-receipt-store"
import { WorkspaceRepository } from "../../../../../../src/integration/filesystem/workspace-repository"
import { GitHubDraftList } from "../../../../../../src/ui/components/github-draft-list"
import { ProjectHeader } from "../../../../../../src/ui/components/project-header"

export default async function GitHubCollaborationPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const backlog = await repository.listBacklog(projectId)
  const receiptStore = new DeliveryReceiptStore(repository.repositoryRoot)
  const drafts = await Promise.all(
    backlog
      .filter((task) => !["done", "archived"].includes(task.status))
      .map(async (task) => {
        const draft = buildGitHubIssueDraft(project, task)
        return {
          taskId: task.id,
          status: task.status,
          draft,
          handoff: buildGitHubPluginHandoff(draft),
          receipt: await receiptStore.read(projectId, task.id),
        }
      }),
  )

  return (
    <main className="workspace-page">
      <ProjectHeader
        projectId={projectId}
        name="Publicação GitHub"
        description="Drafts portáveis; Git e arquivos do Workbench continuam canônicos."
      />
      <div className="agent-detail-toolbar">
        <Link href={`/projects/${projectId}/collaboration`}>← Voltar para colaborar</Link>
        <span>publicação opcional · sem sincronização automática</span>
      </div>
      <GitHubDraftList drafts={drafts} projectId={projectId} />
    </main>
  )
}
