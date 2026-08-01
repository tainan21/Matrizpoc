import { notFound } from "next/navigation"
import { CodexRunStore } from "../../../../../../src/integration/codex/codex-run-store"
import { DeliveryArtifactStore } from "../../../../../../src/integration/collaboration/delivery-artifact-store"
import { DeliveryReceiptStore } from "../../../../../../src/integration/collaboration/delivery-receipt-store"
import { WorkspaceRepository } from "../../../../../../src/integration/filesystem/workspace-repository"
import { DeliveryEvidence } from "../../../../../../src/ui/components/delivery-evidence"
import { ProjectHeader } from "../../../../../../src/ui/components/project-header"
import { toDeliveryEvidenceViewModel } from "../../../../../../src/ui/presenters/delivery-evidence-presenter"
import { toBacklogViewModel } from "../../../../../../src/ui/presenters/workspace-presenters"
import {
  addBacklogReferenceAction,
  archiveBacklogItemAction,
  createAgentRequestAction,
  toggleCriterionAction,
  updateBacklogItemAction,
} from "../../../../../actions"

export default async function BacklogItemPage({ params }: { params: Promise<{ projectId: string; itemId: string }> }) {
  const { projectId, itemId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const item = toBacklogViewModel(await repository.getBacklogItem(projectId, itemId).catch(() => notFound()))
  const requests = (await repository.listAgentRequests(projectId))
    .filter((request) => request.backlogItemId === itemId)
  const runStore = new CodexRunStore(repository.repositoryRoot)
  const artifactStore = new DeliveryArtifactStore(repository.repositoryRoot)
  const [runs, receipt, pullRequests, previews] = await Promise.all([
    Promise.all(requests.map((request) => runStore.read(projectId, request.id))),
    new DeliveryReceiptStore(repository.repositoryRoot).read(projectId, itemId),
    Promise.all(requests.map((request) => artifactStore.readPullRequest(projectId, request.id))),
    Promise.all(requests.map((request) => artifactStore.readPreview(projectId, request.id))),
  ])
  const evidence = toDeliveryEvidenceViewModel(
    requests,
    runs,
    receipt,
    pullRequests,
    previews,
  )
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description={item.id} />
      <div className="workspace-with-inspector">
        <div className="main-column task-detail">
          <form action={updateBacklogItemAction} className="stack">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="revision" value={item.revision} />
            <input className="title-input" name="title" defaultValue={item.title} required />
            <div className="inline-fields">
              <label>Estado<select name="status" defaultValue={item.status}><option value="idea">Ideia</option><option value="ready">Pronta</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="done">Concluída</option></select></label>
              <label>Prioridade<select name="priority" defaultValue={item.priority}><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
              <label>Tags<input name="tags" defaultValue={item.tags.join(", ")} /></label>
            </div>
            <label>Descrição<textarea name="description" rows={10} defaultValue={item.description} /></label>
            <label>Dependências <small>IDs separados por vírgula ou linha</small><textarea name="dependencyIds" rows={3} defaultValue={item.dependencyIds.join("\n")} /></label>
            <div className="form-actions"><button className="button primary" type="submit">Salvar alterações</button></div>
          </form>
          <section className="criteria">
            <div className="section-heading"><h2>Critérios de aceite</h2><span>{item.completion}%</span></div>
            {item.acceptanceCriteria.map((criterion) => (
              <form action={toggleCriterionAction} key={criterion.id}>
                <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="criterionId" value={criterion.id} /><input type="hidden" name="revision" value={item.revision} />
                <button className={criterion.completed ? "checked" : ""} type="submit"><span>{criterion.completed ? "✓" : ""}</span>{criterion.text}</button>
              </form>
            ))}
            {!item.acceptanceCriteria.length ? <p className="muted">Nenhum critério definido.</p> : null}
          </section>
          <DeliveryEvidence evidence={evidence} projectId={projectId} />
        </div>
        <aside className="inspector">
          <div className="inspector-heading"><span>Enviar para agente</span><span className="agent-avatar">AI</span></div>
          <form action={createAgentRequestAction} className="stack">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="backlogItemId" value={item.id} />
            <label>Orientação adicional<textarea name="instructions" rows={6} placeholder="Opcional. O agente também receberá tarefa, critérios e docs vinculados." /></label>
            <button className="button primary" type="submit">Criar solicitação</button>
          </form>
          <hr />
          <div className="inspector-heading"><span>Adicionar referência</span><strong>{item.references.length}</strong></div>
          <form action={addBacklogReferenceAction} className="stack">
            <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="revision" value={item.revision} />
            <label>Tipo<select name="referenceKind"><option value="repository_file">Arquivo do repo</option><option value="external_url">URL externa</option><option value="workbench_document">Documento Workbench</option></select></label>
            <label>Caminho, URL ou document ID<input name="referenceValue" required /></label>
            <label>Rótulo<input name="label" /></label>
            <button className="button ghost" type="submit">Vincular referência</button>
          </form>
          {item.references.map((reference, index) => (
            <div className="reference-line" key={`${reference.kind}-${index}`}>
              <strong>{reference.label ?? reference.kind}</strong>
              <code>{"path" in reference ? reference.path : "url" in reference ? reference.url : reference.documentId}</code>
            </div>
          ))}
          <hr />
          <form action={archiveBacklogItemAction}>
            <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="revision" value={item.revision} />
            <button className="button danger-button" type="submit">Arquivar tarefa</button>
          </form>
        </aside>
      </div>
    </main>
  )
}
