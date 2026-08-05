import Link from "next/link"
import { notFound } from "next/navigation"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"

export default async function AgentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const requests = await repository.listAgentRequests(projectId)
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description="Fila explícita, contexto limitado e conclusão com evidências." />
      <section className="agent-queue">
        <div className="table-head agent-head"><span>Solicitação</span><span>Responsável</span><span>Atualizada</span><span>Estado</span></div>
        {requests.map((request) => (
          <article id={request.id} className="agent-request" key={request.id}>
            <span className="agent-avatar">AI</span>
            <span className="row-main"><strong><Link href={`/projects/${projectId}/agents/${request.id}`}>{request.title}</Link></strong><small>{request.id} · tarefa {request.backlogItemId}</small></span>
            <span>{request.claimedBy ?? "não atribuída"}</span>
            <time>{new Date(request.updatedAt).toLocaleString("pt-BR")}</time>
            <span className={`status-chip ${request.status}`}>{request.status.replace("_", " ")}</span>
            {request.resultSummary ? (
              <div className="agent-result">
                <strong>Resultado</strong>
                <p>{request.resultSummary}</p>
                <div className="evidence-grid">
                  <div>
                    <small>Arquivos afetados · {request.changedFiles.length}</small>
                    {request.changedFiles.length
                      ? request.changedFiles.map((file) => <code key={file}>{file}</code>)
                      : <span>Nenhuma alteração de arquivo.</span>}
                  </div>
                  <div>
                    <small>Verificações · {request.checks.length}</small>
                    {request.checks.map((check) => <span key={check}>✓ {check}</span>)}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        ))}
        {!requests.length ? <div className="empty-inline"><strong>Fila vazia</strong><span>Abra uma tarefa do backlog e crie uma solicitação para agente.</span></div> : null}
      </section>
      <aside className="protocol-note"><span className="live-dot" /><div><strong>Protocolo MCP STDIO</strong><p>Agentes leem livremente. Tools de escrita devem ser aprovadas no Codex e registram cada mudança na activity.</p></div></aside>
    </main>
  )
}
