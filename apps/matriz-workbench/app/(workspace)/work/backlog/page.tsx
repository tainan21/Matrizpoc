import Link from "next/link"
import { bulkWorkItemsAction } from "../../../actions"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"
import { toAdaptiveWorkItemViewModel } from "../../../../src/ui/presenters/adaptive-work-presenter"

export default async function AdaptiveBacklogPage({ searchParams }: { searchParams: Promise<{ project?: string; status?: string; q?: string; group?: string; bulk?: string }> }) {
  const query = await searchParams
  const repository = await WorkspaceRepository.create()
  const projects = (await repository.discoverProjects()).filter((project) => project.initialized && !project.corrupted)
  const collections = await Promise.all(projects.map(async (project) => ({ project, items: await repository.listWorkItems(project.id) })))
  const sprints = (await repository.listSprints()).filter((sprint) => ["planning", "active"].includes(sprint.status))
  const allItems = collections.flatMap(({ project, items }) => {
    const byId = new Map(items.map((item) => [item.id, item.title]))
    return items.map((item) => toAdaptiveWorkItemViewModel(item, { projectName: project.displayName, parentTitle: item.parentId ? byId.get(item.parentId) : undefined }))
  })
  const normalized = query.q?.trim().toLocaleLowerCase("pt-BR")
  const filtered = allItems.filter((item) =>
    (!query.project || item.projectId === query.project) &&
    (!query.status || item.status === query.status) &&
    (!normalized || `${item.title} ${item.domain} ${item.responsible} ${item.id}`.toLocaleLowerCase("pt-BR").includes(normalized)),
  )
  const grouped = new Map<string, typeof filtered>()
  for (const item of filtered) {
    const key = query.group === "outcome" ? item.parentTitle ?? "Sem Outcome" : query.group === "domain" ? item.domain : query.group === "status" ? item.status : item.projectName
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  return (
    <>
      <header className="page-header compact-header"><div><p className="eyebrow">Trabalho organizado</p><h1>Backlog</h1><p>Uma visão multi-projeto por prontidão, relação e intenção — o Board operacional continua em cada projeto.</p></div><Link className="button primary" href="/work/inbox">Capturar entrada</Link></header>
      <form className="adaptive-toolbar">
        <input defaultValue={query.q ?? ""} name="q" placeholder="Buscar título, domínio, responsável ou ID" />
        <select defaultValue={query.project ?? ""} name="project"><option value="">Todos os projetos</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.displayName}</option>)}</select>
        <select defaultValue={query.status ?? ""} name="status"><option value="">Todos os estados</option><option value="discovery">Descoberta</option><option value="refined">Refinado</option><option value="ready">Pronto</option><option value="in_progress">Em execução</option><option value="validation">Validação</option><option value="completed">Concluído</option></select>
        <select defaultValue={query.group ?? "project"} name="group"><option value="project">Agrupar por projeto</option><option value="outcome">Agrupar por Outcome</option><option value="domain">Agrupar por domínio</option><option value="status">Agrupar por estado</option></select>
        <button className="button" type="submit">Aplicar</button>
      </form>
      {query.bulk ? <div className="bulk-notice" role="status">{query.bulk === "empty" ? "Selecione ao menos um item." : "Ação em massa concluída."}</div> : null}
      <form action={bulkWorkItemsAction} className="structured-backlog">
        <div className="bulk-bar" aria-label="Ações em massa">
          <span>Selecione linhas e aplique somente mudanças operacionais.</span>
          <select defaultValue="medium" name="bulkPriority"><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select>
          <button className="button" name="operation" type="submit" value="priority">Prioridade</button>
          <input name="bulkDomain" placeholder="Domínio" /><button className="button" name="operation" type="submit" value="domain">Definir domínio</button>
          <select name="sprintCommitment"><option value="">Outcome da sprint</option>{sprints.flatMap((sprint) => sprint.outcomes.map((outcome) => <option key={outcome.id} value={`${sprint.id}:${outcome.id}`}>{sprint.name} · {outcome.title}</option>))}</select><button className="button" name="operation" type="submit" value="promote">Promover</button>
          <input name="bulkArchiveReason" placeholder="Motivo do arquivamento" /><button className="button" name="operation" type="submit" value="archive">Arquivar</button>
        </div>
        {[...grouped.entries()].map(([group, items]) => (
          <section className="backlog-group" key={group}><header><h2>{group}</h2><span>{items.length} itens</span></header>{items.map((item) => (
            <div className="structured-row" key={`${item.projectId}:${item.id}`}>
              <input aria-label={`Selecionar ${item.title}`} name="workRef" type="checkbox" value={`${item.projectId}:${item.id}:${item.revision}`} />
              <span className={`priority-bar ${item.priority}`} /><Link className="row-main" href={item.href}><strong>{item.title}</strong><small>{item.kind} · {item.projectName}{item.parentTitle ? ` · ${item.parentTitle}` : ""}</small></Link>
              <span>{item.domain}</span><span>{item.responsible}</span><span className={item.readinessGaps.length ? "readiness warn" : "readiness ready"}>{item.readinessLabel}</span><span className={`status-chip ${item.status}`}><i />{item.status}</span>
            </div>
          ))}</section>
        ))}
        {!filtered.length ? <div className="empty-state"><strong>Nenhum trabalho encontrado.</strong><span>Ajuste os filtros ou classifique uma entrada da Inbox.</span></div> : null}
      </form>
    </>
  )
}
