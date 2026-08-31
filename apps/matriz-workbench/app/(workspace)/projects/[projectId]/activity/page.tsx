import Link from "next/link"
import { notFound } from "next/navigation"
import type { ActivityEvent } from "../../../../../src/domain/schemas"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"
import { groupActivityEventsByDay, toActivityEventViewModel } from "../../../../../src/ui/presenters/activity-presenter"

const ACTORS: ActivityEvent["actor"][] = ["human", "codex", "agent", "system"]
const ENTITY_TYPES: ActivityEvent["entityType"][] = [
  "project",
  "roadmap",
  "backlog",
  "document",
  "agent_request",
]

function dateBoundary(value: string | undefined, afterDay = false): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf())) return undefined
  if (afterDay) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{
    actor?: string
    entityType?: string
    q?: string
    since?: string
    until?: string
  }>
}) {
  const { projectId } = await params
  const filters = await searchParams
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const actor = ACTORS.find((value) => value === filters.actor)
  const entityType = ENTITY_TYPES.find((value) => value === filters.entityType)
  const [activity, retention] = await Promise.all([
    repository.queryActivity(projectId, {
      actor,
      entityType,
      text: filters.q,
      since: dateBoundary(filters.since),
      until: dateBoundary(filters.until, true),
      limit: 250,
    }),
    repository.getActivityRetentionReport(projectId),
  ])
  const hasFilters = Boolean(
    actor || entityType || filters.q || filters.since || filters.until,
  )
  const activityView = activity.map(toActivityEventViewModel)
  const activityDays = groupActivityEventsByDay(activityView)

  return (
    <main className="workspace-page">
      <ProjectHeader
        projectId={projectId}
        name={project.workspace.displayName}
        description="Registro append-only consultável de decisões e mudanças no workspace."
      />
      <section className="activity-audit-summary" aria-label="Retenção da auditoria">
        <div><strong>{activity.length}</strong><span>eventos exibidos</span></div>
        <div><strong>{retention.months}</strong><span>meses versionados</span></div>
        <div>
          <strong>{(retention.totalBytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB</strong>
          <span>armazenamento JSONL</span>
        </div>
        <div>
          <strong>{retention.oversizedMonths.length ? "atenção" : "íntegro"}</strong>
          <span>limite de 2 MB/mês</span>
        </div>
      </section>
      <form className="activity-filters" method="get">
        <label>
          Buscar
          <input
            defaultValue={filters.q?.slice(0, 120)}
            maxLength={120}
            name="q"
            placeholder="Resumo, ação ou ID"
          />
        </label>
        <label>
          Ator
          <select defaultValue={actor ?? ""} name="actor">
            <option value="">Todos</option>
            {ACTORS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Entidade
          <select defaultValue={entityType ?? ""} name="entityType">
            <option value="">Todas</option>
            {ENTITY_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>Desde<input defaultValue={filters.since} name="since" type="date" /></label>
        <label>Até<input defaultValue={filters.until} name="until" type="date" /></label>
        <button className="button primary" type="submit">Filtrar</button>
        {hasFilters ? <Link className="button" href={`/projects/${projectId}/activity`}>Limpar</Link> : null}
      </form>
      <section className="activity-log" aria-label="Timeline de atividade">
        {activityDays.map((day) => (
          <section className="activity-day" key={day.date}>
            <header><h2>{day.label}</h2><span>{day.events.length} eventos</span></header>
            {day.events.map((event) => (
              <article key={event.id}>
                <time>{new Date(event.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
                <span className={`actor ${event.actor}`}>{event.actor}</span>
                <span className="activity-marker" aria-hidden="true" />
                <span className="row-main">
                  <strong>{event.summary}</strong>
                  <small>{event.action} · {event.entityType}/{event.entityId}</small>
                </span>
              </article>
            ))}
          </section>
        ))}
        {!activity.length ? (
          <div className="empty-inline">
            <strong>{hasFilters ? "Nenhum evento corresponde aos filtros" : "Sem atividade"}</strong>
            <span>{hasFilters ? "Ajuste ou limpe a consulta." : "Eventos surgirão conforme o workspace for usado."}</span>
          </div>
        ) : null}
      </section>
    </main>
  )
}
