"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { saveRoadmapMarkerAction, type RoadmapMutationResult } from "../../../app/actions"
import type { RoadmapMarkerInspectorViewModel } from "../presenters/roadmap-timeline-presenter"
import styles from "./roadmap-timeline.module.css"

const outcomeStatuses = { planned: "Planejado", achieved: "Atingido", missed: "Não atingido", cancelled: "Cancelado" }
const gateStatuses = { planned: "Planejado", pending_review: "Aguardando revisão", passed: "Aprovado", failed: "Reprovado", waived: "Dispensado" }

export function RoadmapMarkerInspector({ item, projectId, onClose }: { item: RoadmapMarkerInspectorViewModel; projectId: string; onClose: () => void }) {
  const router = useRouter()
  const closeButton = useRef<HTMLButtonElement>(null)
  const [tab, setTab] = useState<"overview" | "evidence" | "items" | "history">("overview")
  const [notice, setNotice] = useState<RoadmapMutationResult>()
  const [pending, startTransition] = useTransition()
  const isGate = item.kind === "validation_gate" || item.kind === "decision_gate"
  const statuses = isGate ? gateStatuses : outcomeStatuses

  useEffect(() => {
    closeButton.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [onClose])

  function save(formData: FormData) {
    setNotice(undefined)
    startTransition(async () => {
      const result = await saveRoadmapMarkerAction(formData)
      setNotice(result)
      if (result.status === "success") router.refresh()
    })
  }

  return (
    <aside aria-label={`Inspector do marcador ${item.title}`} className={styles.inspector}>
      <header className={styles.inspectorHeader}><div><span>{item.phaseTitle} / {item.kindLabel}</span><h2>{item.title}</h2></div><button aria-label="Fechar inspector" onClick={onClose} ref={closeButton} type="button">×</button></header>
      <div className={styles.inspectorStatus}><span className={`${styles.markerGlyph} ${styles[item.kind]}`} /><strong>{item.statusLabel}</strong><span>{item.targetDateLabel}</span></div>
      <nav aria-label="Seções do marcador" className={styles.inspectorTabs}>
        {(["overview", "evidence", "items", "history"] as const).map((value) => <button aria-current={tab === value ? "page" : undefined} key={value} onClick={() => setTab(value)} type="button">{{ overview: "Visão geral", evidence: "Evidências", items: "Itens", history: "Histórico" }[value]}</button>)}
      </nav>
      {notice ? <div className={`${styles.notice} ${styles[notice.status]}`} role={notice.status === "success" ? "status" : "alert"}><span>{notice.message}</span>{notice.status === "conflict" ? <button onClick={() => router.refresh()} type="button">Recarregar</button> : null}</div> : null}
      <form action={save} className={styles.inspectorForm}>
        <input name="projectId" type="hidden" value={projectId} /><input name="markerId" type="hidden" value={item.id} /><input name="revision" type="hidden" value={item.roadmapRevision} /><input name="phaseId" type="hidden" value={item.phaseId} /><input name="initiativeId" type="hidden" value={item.initiativeId ?? ""} />
        <div hidden={tab !== "overview"}>
          <label>Título<input defaultValue={item.title} disabled={pending} maxLength={160} name="title" required /></label>
          <label>Descrição<textarea defaultValue={item.description} disabled={pending} maxLength={1000} name="description" rows={4} /></label>
          <div className={styles.fieldGrid}><label>Estado<select defaultValue={item.status} disabled={pending} name="status">{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Data alvo<input defaultValue={item.targetDate} disabled={pending} name="targetDate" required type="date" /></label></div>
          <label>Responsável<input defaultValue={item.responsible === "Não atribuído" ? "" : item.responsible} disabled={pending} name="responsible" /></label>
          {isGate ? <><label>Revisado por pessoa<input defaultValue={item.reviewedBy} disabled={pending} name="reviewedBy" placeholder="Obrigatório para aprovar" /></label><label>Nota de revisão<textarea defaultValue={item.reviewNote} disabled={pending} name="reviewNote" rows={3} /></label><label>Justificativa de dispensa<textarea defaultValue={item.waiverReason} disabled={pending} name="waiverReason" rows={3} /></label></> : null}
        </div>
        <div hidden={tab !== "evidence"}>
          <div className={styles.inspectorSection}><header><h3>Evidências revisáveis</h3><span>{item.evidenceCount}</span></header>{item.references.map((reference, index) => <div className={styles.referenceRow} key={`${reference.kind}-${index}`}><strong>{reference.label ?? reference.kind}</strong><small>{reference.kind === "repository_file" ? reference.path : reference.kind === "external_url" ? reference.url : reference.documentId}</small></div>)}{!item.references.length ? <p>Nenhuma evidência direta vinculada.</p> : null}</div>
          <label>Tipo de nova referência<select disabled={pending} name="referenceKind"><option value="">Não adicionar</option><option value="repository_file">Arquivo do repositório</option><option value="external_url">URL externa</option><option value="workbench_document">Documento Workbench</option></select></label>
          <label>Valor<input disabled={pending} name="referenceValue" placeholder="caminho, URL ou doc_uuid" /></label><label>Rótulo<input disabled={pending} name="referenceLabel" /></label>
        </div>
        <div hidden={tab !== "items"}>
          <label>Work items vinculados <small>um ID por linha</small><textarea defaultValue={[...item.linkedItems.map((linked) => linked.id), ...item.missingBacklogIds].join("\n")} disabled={pending} name="backlogIds" rows={6} /></label>
          <section className={styles.inspectorSection}>{item.linkedItems.map((linked) => <Link href={`/projects/${projectId}/backlog?item=${linked.id}`} key={linked.id}><span className={`${styles.linkedState} ${linked.completed ? styles.completed : ""}`} /><span><strong>{linked.title}</strong><small>{linked.productStatus} · {linked.evidenceCount} evidência(s)</small></span></Link>)}{item.missingBacklogIds.map((id) => <div className={styles.missingLink} key={id}><strong>{id}</strong><small>Referência quebrada</small></div>)}</section>
        </div>
        <div hidden={tab !== "history"}><section className={styles.inspectorSection}><header><h3>Histórico do marcador</h3><span>{item.history.length}</span></header><div className={styles.history}>{item.history.map((event) => <div key={event.id}><i /><span><strong>{event.summary}</strong><small>{event.actor} · {new Date(event.occurredAt).toLocaleString("pt-BR")}</small></span></div>)}{!item.history.length ? <p>As alterações deste marcador aparecerão aqui.</p> : null}</div></section></div>
        <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? "Salvando…" : tab === "evidence" ? "Salvar evidência" : "Salvar marcador"}</button>
      </form>
    </aside>
  )
}
