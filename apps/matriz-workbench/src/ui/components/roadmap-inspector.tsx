"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { saveRoadmapInitiativeAction, type RoadmapMutationResult } from "../../../app/actions"
import { ROADMAP_STATUS_LABELS, type RoadmapInspectorViewModel } from "../presenters/roadmap-timeline-presenter"
import styles from "./roadmap-timeline.module.css"

export function RoadmapInspector({
  item,
  projectId,
  onClose,
}: {
  item: RoadmapInspectorViewModel
  projectId: string
  onClose: () => void
}) {
  const router = useRouter()
  const closeButton = useRef<HTMLButtonElement>(null)
  const [notice, setNotice] = useState<RoadmapMutationResult>()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  function save(formData: FormData) {
    setNotice(undefined)
    startTransition(async () => {
      const result = await saveRoadmapInitiativeAction(formData)
      setNotice(result)
      if (result.status === "success") router.refresh()
    })
  }

  return (
    <aside aria-label={`Inspector de ${item.title}`} className={styles.inspector}>
      <header className={styles.inspectorHeader}>
        <div>
          <span>{item.phaseTitle} / Roadmap</span>
          <h2>{item.title}</h2>
        </div>
        <button aria-label="Fechar inspector" onClick={onClose} ref={closeButton} type="button">×</button>
      </header>

      <div className={styles.inspectorStatus}>
        <span className={`${styles.statusDot} ${styles[item.status]}`} />
        <strong>{item.statusLabel}</strong>
        <span>{item.timeRangeLabel}</span>
      </div>

      {notice ? (
        <div className={`${styles.notice} ${styles[notice.status]}`} role={notice.status === "success" ? "status" : "alert"}>
          <span>{notice.message}</span>
          {notice.status === "conflict" ? <button onClick={() => router.refresh()} type="button">Recarregar</button> : null}
        </div>
      ) : null}

      <form action={save} className={styles.inspectorForm}>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="phaseId" type="hidden" value={item.phaseId} />
        <input name="initiativeId" type="hidden" value={item.id} />
        <input name="revision" type="hidden" value={item.roadmapRevision} />

        <label>Título<input defaultValue={item.title} disabled={pending} maxLength={160} name="title" required /></label>
        <label>Outcome<textarea defaultValue={item.outcome} disabled={pending} maxLength={500} name="outcome" rows={4} /></label>
        <div className={styles.fieldGrid}>
          <label>Estado<select defaultValue={item.status} disabled={pending} name="status">{Object.entries(ROADMAP_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Responsável<input defaultValue={item.responsible === "Não atribuído" ? "" : item.responsible} disabled={pending} name="responsible" /></label>
        </div>
        <label>Domínio<input defaultValue={item.domain === item.phaseTitle ? "" : item.domain} disabled={pending} name="domain" /></label>
        <div className={styles.fieldGrid}>
          <label>Início<input defaultValue={item.startDate} disabled={pending} name="startDate" type="date" /></label>
          <label>Data alvo<input defaultValue={item.targetDate} disabled={pending} name="targetDate" type="date" /></label>
        </div>
        <label>Work items vinculados <small>um ID por linha</small><textarea defaultValue={[...item.linkedItems.map((linked) => linked.id), ...item.missingBacklogIds].join("\n")} disabled={pending} name="backlogIds" rows={4} /></label>
        <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar iniciativa"}</button>
      </form>

      <section className={styles.inspectorSection}>
        <header><h3>Entrega vinculada</h3><span>{item.completion === null ? "Sem itens" : `${item.completion}%`}</span></header>
        {item.linkedItems.map((linked) => (
          <Link href={`/projects/${projectId}/backlog?item=${linked.id}`} key={linked.id}>
            <span className={`${styles.linkedState} ${linked.completed ? styles.completed : ""}`} />
            <span><strong>{linked.title}</strong><small>{linked.kind} · {linked.productStatus} · {linked.evidenceCount} evidência(s)</small></span>
          </Link>
        ))}
        {item.missingBacklogIds.map((id) => <div className={styles.missingLink} key={id}><strong>{id}</strong><small>Referência não encontrada</small></div>)}
        {!item.linkedItems.length && !item.missingBacklogIds.length ? <p>Nenhum work item vinculado. O progresso não é estimado.</p> : null}
      </section>

      <section className={styles.inspectorSection}>
        <header><h3>Histórico</h3><span>{item.history.length}</span></header>
        <div className={styles.history}>
          {item.history.map((event) => <div key={event.id}><i /><span><strong>{event.summary}</strong><small>{event.actor} · {new Date(event.occurredAt).toLocaleString("pt-BR")}</small></span></div>)}
          {!item.history.length ? <p>As próximas alterações desta iniciativa aparecerão aqui.</p> : null}
        </div>
      </section>
    </aside>
  )
}
