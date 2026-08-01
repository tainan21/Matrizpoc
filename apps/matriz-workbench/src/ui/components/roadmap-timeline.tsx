"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { CSSProperties } from "react"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  addRoadmapInitiativeAction,
  addRoadmapPhaseAction,
  type RoadmapMutationResult,
} from "../../../app/actions"
import type { ProjectNavViewModel } from "../presenters/workspace-presenters"
import {
  ROADMAP_STATUS_LABELS,
  type RoadmapInspectorViewModel,
  type RoadmapTimelineViewModel,
} from "../presenters/roadmap-timeline-presenter"
import { RoadmapInspector } from "./roadmap-inspector"
import styles from "./roadmap-timeline.module.css"

type TimelineStyle = CSSProperties & {
  "--left"?: string
  "--width"?: string
  "--row"?: number
  "--quarter-count"?: number
  "--rows"?: number
}

export function RoadmapTimeline({
  projectId,
  projectName,
  projects,
  initialTimeline,
  selected,
}: {
  projectId: string
  projectName: string
  projects: ProjectNavViewModel[]
  initialTimeline: RoadmapTimelineViewModel
  selected?: RoadmapInspectorViewModel
}) {
  const router = useRouter()
  const [timeline, setTimeline] = useState(initialTimeline)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [composer, setComposer] = useState<"initiative" | "phase">()
  const [notice, setNotice] = useState<RoadmapMutationResult>()
  const [pending, startTransition] = useTransition()

  useEffect(() => setTimeline(initialTimeline), [initialTimeline])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR")
    return {
      ...timeline,
      phases: timeline.phases.map((phase) => {
        const initiatives = phase.initiatives.filter((initiative) => {
          if (status && initiative.status !== status) return false
          return !term || `${initiative.title} ${initiative.outcome} ${initiative.domain} ${initiative.responsible}`.toLocaleLowerCase("pt-BR").includes(term)
        })
        return {
          ...phase,
          initiatives,
          scheduled: initiatives.filter((initiative) => initiative.startDate && initiative.targetDate),
          unscheduled: initiatives.filter((initiative) => !initiative.startDate || !initiative.targetDate),
        }
      }),
    }
  }, [query, status, timeline])

  function navigateToInitiative(initiativeId?: string) {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)
    if (initiativeId) params.set("initiative", initiativeId)
    else params.delete("initiative")
    const search = params.toString()
    router.replace(`/projects/${projectId}/roadmap${search ? `?${search}` : ""}`, { scroll: false })
  }

  function mutate(action: (data: FormData) => Promise<RoadmapMutationResult>, formData: FormData) {
    setNotice(undefined)
    startTransition(async () => {
      const result = await action(formData)
      setNotice(result)
      if (result.status === "success") {
        setComposer(undefined)
        if (result.entityId.startsWith("ini_")) navigateToInitiative(result.entityId)
        router.refresh()
      }
    })
  }

  const visibleCount = filtered.phases.reduce((total, phase) => total + phase.initiatives.length, 0)

  return (
    <main className={`${styles.workspace} roadmap-timeline-route`}>
      <header className={styles.commandBar}>
        <label>Projeto<select onChange={(event) => router.push(`/projects/${event.target.value}/roadmap`)} value={projectId}>{projects.filter((project) => project.initialized).map((project) => <option key={project.id} value={project.id}>{project.displayName}</option>)}</select></label>
        <label>Estado<select onChange={(event) => setStatus(event.target.value)} value={status}><option value="">Todos os estados</option>{Object.entries(ROADMAP_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className={styles.search}><span aria-hidden="true">⌕</span><input aria-label="Buscar iniciativas" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar iniciativa, outcome ou responsável…" type="search" value={query} /></div>
        <nav aria-label="Visões do projeto"><Link href={`/projects/${projectId}/backlog`}>Board</Link><span aria-current="page">Roadmap</span><Link href={`/projects/${projectId}/activity`}>Histórico</Link></nav>
        <button className={styles.phaseButton} onClick={() => setComposer("phase")} type="button">Nova fase</button>
        <button className={styles.newButton} disabled={!timeline.phases.length} onClick={() => setComposer("initiative")} type="button">＋ Nova iniciativa</button>
      </header>

      <div className={styles.heading}>
        <div><span>Matriz Workbench / {projectId}</span><h1>{projectName} · Roadmap estratégico</h1><p>Iniciativas por fase e período, vinculadas ao trabalho verificável.</p></div>
        <div className={styles.summary}><strong>{visibleCount}</strong><span>iniciativas</span><strong>{timeline.scheduledCount}</strong><span>planejadas no tempo</span></div>
      </div>

      {notice ? <div className={`${styles.noticeBar} ${styles[notice.status]}`} role={notice.status === "success" ? "status" : "alert"}><span>{notice.message}</span>{notice.status === "conflict" ? <button onClick={() => router.refresh()} type="button">Recarregar</button> : null}</div> : null}
      <div className={styles.srStatus} aria-live="polite">{pending ? "Salvando roadmap" : notice?.message ?? ""}</div>

      <div className={`${styles.content} ${selected ? styles.hasInspector : ""}`}>
        <section aria-label="Timeline do roadmap" className={styles.timeline}>
          <header className={styles.axisHeader}>
            <div>Fase / Outcome</div>
            <div className={styles.quarters} style={{ "--quarter-count": filtered.quarters.length } as TimelineStyle}>{filtered.quarters.map((quarter) => <div className={quarter.isCurrent ? styles.currentQuarter : ""} key={quarter.id}><strong>{quarter.label}</strong><small>{quarter.range}</small>{quarter.isCurrent ? <em>Hoje</em> : null}</div>)}</div>
          </header>

          {filtered.phases.map((phase) => (
            <section className={styles.phaseRow} key={phase.id}>
              <header><div><span className={`${styles.statusDot} ${styles[phase.status]}`} /><h2>{phase.title}</h2></div><p>{phase.outcome || "Outcome ainda não definido."}</p><small>{phase.initiatives.length} iniciativa(s) · {phase.progress}% concluído</small></header>
              <div className={styles.lane} style={{ "--rows": Math.max(phase.scheduled.length, 1) } as TimelineStyle}>
                <div className={styles.gridLines} style={{ "--quarter-count": filtered.quarters.length } as TimelineStyle}>{filtered.quarters.map((quarter) => <i key={quarter.id} />)}</div>
                {filtered.todayPosition !== undefined ? <i className={styles.todayLine} style={{ left: `${filtered.todayPosition}%` }}><span>Hoje</span></i> : null}
                {phase.scheduled.map((initiative, row) => (
                  <button
                    aria-current={selected?.id === initiative.id ? "true" : undefined}
                    className={`${styles.bar} ${styles[initiative.status]} ${selected?.id === initiative.id ? styles.selectedBar : ""}`}
                    key={initiative.id}
                    onClick={() => navigateToInitiative(initiative.id)}
                    style={{ "--left": `${initiative.left}%`, "--width": `${initiative.width}%`, "--row": row } as TimelineStyle}
                    title={`${initiative.title} · ${initiative.timeRangeLabel}`}
                    type="button"
                  >
                    <span>{initiative.status === "completed" ? "✓" : ""}</span><strong>{initiative.title}</strong><small>{initiative.completion === null ? initiative.responsible : `${initiative.completion}%`}</small>
                  </button>
                ))}
                {!phase.scheduled.length ? <div className={styles.emptyLane}>Nenhuma iniciativa desta fase possui período definido.</div> : null}
              </div>
              {phase.unscheduled.length ? <div className={styles.unscheduled}><span>Sem período</span>{phase.unscheduled.map((initiative) => <button aria-current={selected?.id === initiative.id ? "true" : undefined} key={initiative.id} onClick={() => navigateToInitiative(initiative.id)} type="button"><i className={`${styles.statusDot} ${styles[initiative.status]}`} /><strong>{initiative.title}</strong><small>{initiative.statusLabel}</small></button>)}</div> : null}
            </section>
          ))}

          {!timeline.phases.length ? <div className={styles.emptyState}><span>01</span><h2>Defina a direção antes do calendário</h2><p>Crie uma fase com um outcome observável. Iniciativas e períodos entram depois.</p><button onClick={() => setComposer("phase")} type="button">Criar primeira fase</button></div> : visibleCount === 0 ? <div className={styles.emptyState}><h2>Nenhuma iniciativa corresponde aos filtros</h2><p>Limpe a busca ou selecione outro estado.</p><button onClick={() => { setQuery(""); setStatus("") }} type="button">Limpar filtros</button></div> : null}
        </section>
        {selected ? <RoadmapInspector item={selected} key={selected.roadmapRevision} onClose={() => navigateToInitiative()} projectId={projectId} /> : null}
      </div>

      {composer ? (
        <div className={styles.backdrop} onKeyDown={(event) => { if (event.key === "Escape") setComposer(undefined) }} onMouseDown={(event) => { if (event.target === event.currentTarget) setComposer(undefined) }}>
          <section aria-labelledby="roadmap-composer-title" aria-modal="true" className={styles.composer} role="dialog">
            <header><div><span>Planejamento permanente</span><h2 id="roadmap-composer-title">{composer === "phase" ? "Nova fase" : "Nova iniciativa"}</h2></div><button aria-label="Fechar" onClick={() => setComposer(undefined)} type="button">×</button></header>
            <form action={(formData) => mutate(composer === "phase" ? addRoadmapPhaseAction : addRoadmapInitiativeAction, formData)}>
              <input name="projectId" type="hidden" value={projectId} /><input name="revision" type="hidden" value={timeline.revision} />
              {composer === "initiative" ? <label>Fase<select autoFocus name="phaseId">{timeline.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}</select></label> : null}
              <label>Título<input autoFocus={composer === "phase"} maxLength={composer === "phase" ? 120 : 160} name="title" required /></label>
              <label>Outcome<textarea maxLength={500} name="outcome" rows={4} /></label>
              {composer === "initiative" ? <><div className={styles.fieldGrid}><label>Domínio<input name="domain" /></label><label>Responsável<input name="responsible" /></label></div><div className={styles.fieldGrid}><label>Início<input name="startDate" type="date" /></label><label>Data alvo<input name="targetDate" type="date" /></label></div><label>Work items <small>IDs `tsk_` ou `wi_`, um por linha</small><textarea name="backlogIds" rows={3} /></label></> : null}
              <footer><button onClick={() => setComposer(undefined)} type="button">Cancelar</button><button className={styles.primaryButton} disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar"}</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
