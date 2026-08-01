import Link from "next/link"
import { notFound } from "next/navigation"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"
import { toBacklogViewModel } from "../../../../../src/ui/presenters/workspace-presenters"
import { createBacklogItemAction } from "../../../../actions"
import { analyzeBacklogItem } from "../../../../../src/application/backlog-intelligence"

export default async function BacklogPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ status?: string; q?: string; site?: string }>
}) {
  const { projectId } = await params
  const filters = await searchParams
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const rawBacklog = await repository.listBacklog(projectId)
  const all = rawBacklog.map((item) => ({
    ...toBacklogViewModel(item),
    intelligence: analyzeBacklogItem(item, rawBacklog),
  }))
  const items = all.filter((item) => {
    if (filters.status && item.status !== filters.status) return false
    if (
      filters.site &&
      (item.workScope.kind !== "site" || item.workScope.id !== filters.site)
    ) return false
    if (filters.q && !`${item.title} ${item.tags.join(" ")} ${item.id}`.toLowerCase().includes(filters.q.toLowerCase())) return false
    return item.status !== "archived" || filters.status === "archived"
  })
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description="Trabalho executável, critérios claros e dependências visíveis." />
      <section className="toolbar">
        <form className="search-form">
          <input name="q" defaultValue={filters.q} placeholder="Buscar por título, tag ou ID…" />
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos os estados</option>
            <option value="idea">Ideia</option><option value="ready">Pronta</option>
            <option value="in_progress">Em andamento</option><option value="blocked">Bloqueada</option>
            <option value="review">Em revisão</option><option value="done">Concluída</option>
            <option value="archived">Arquivada</option>
          </select>
          <input name="site" defaultValue={filters.site} placeholder="Site ID" />
          <button className="button ghost">Filtrar</button>
        </form>
        <span>{items.length} de {all.length} itens</span>
      </section>
      <section className="backlog-table">
        <div className="table-head backlog-head"><span>Prioridade</span><span>Trabalho</span><span>Prontidão</span><span>Próxima ação</span><span>Estado</span></div>
        {items.map((item) => (
          <Link className="backlog-row" href={`/projects/${projectId}/backlog/${item.id}`} key={item.id}>
            <span className={`priority-label ${item.priority}`}>{item.priorityLabel}</span>
            <span className="row-main"><strong>{item.title}</strong><small>{item.id} {item.workScope.kind === "site" ? `site:${item.workScope.id} ` : ""}{item.tags.map((tag) => `#${tag}`).join(" ")}</small></span>
            <span><strong>{item.intelligence.readiness}%</strong><small>{item.intelligence.missingContext.length ? `${item.intelligence.missingContext.length} lacuna(s)` : "contexto suficiente"}</small></span>
            <span className="intelligence-action"><strong>{item.intelligence.nextAction}</strong><small>{item.intelligence.blockedBy.length ? `${item.intelligence.blockedBy.length} bloqueio(s)` : `${item.acceptanceCriteria.length} critérios`}</small></span>
            <span className={`status-chip ${item.status}`}>{item.statusLabel}</span>
          </Link>
        ))}
        {!items.length ? <div className="empty-inline"><strong>Nenhum item neste recorte</strong><span>Ajuste os filtros ou crie trabalho novo.</span></div> : null}
      </section>
      <details className="composer" open={!all.length}>
        <summary>Nova tarefa</summary>
        <form action={createBacklogItemAction} className="form-grid">
          <input type="hidden" name="projectId" value={projectId} />
          <label className="wide">Título<input name="title" required maxLength={180} placeholder="Resultado específico e verificável" /></label>
          <label>Prioridade<select name="priority" defaultValue="medium"><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
          <label>Tags<input name="tags" placeholder="frontend, segurança" /></label>
          <label>Site ID <small>opcional</small><input name="siteId" pattern="[a-z0-9][a-z0-9-]*" placeholder="example" /></label>
          <label className="wide">Descrição<textarea name="description" rows={5} maxLength={8000} /></label>
          <label className="wide">Critérios de aceite <small>um por linha</small><textarea name="acceptanceCriteria" rows={5} /></label>
          <div className="form-actions wide"><button className="button primary" type="submit">Criar tarefa</button></div>
        </form>
      </details>
    </main>
  )
}
