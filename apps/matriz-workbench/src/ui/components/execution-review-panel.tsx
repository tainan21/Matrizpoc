"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  reviewAgentExecutionAction,
  type AgentExecutionReviewResult,
} from "../../../app/actions"
import type { ExecutionReviewViewModel } from "../presenters/work-item-detail-presenter"
import styles from "./work-item-detail.module.css"

export function ExecutionReviewPanel({
  projectId,
  execution,
  compact = false,
}: {
  projectId: string
  execution: ExecutionReviewViewModel
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AgentExecutionReviewResult>()

  function submit(formData: FormData) {
    setResult(undefined)
    startTransition(async () => {
      const next = await reviewAgentExecutionAction(formData)
      setResult(next)
      if (next.status === "success") router.refresh()
    })
  }

  return (
    <section className={`${styles.reviewPanel} ${compact ? styles.compactReview : ""}`} aria-label={`Revisão da execução ${execution.requestId}`}>
      <header>
        <div>
          <span className={styles.eyebrow}>Revisão humana da execução</span>
          <strong>{execution.reviewStatus === "pending" ? "Aguardando decisão" : execution.reviewStatus === "approved" ? "Execução aprovada" : "Alterações solicitadas"}</strong>
        </div>
        <span className={`${styles.reviewChip} ${styles[execution.reviewStatus]}`}>{execution.reviewStatus.replace("_", " ")}</span>
      </header>

      {execution.reviewIsStale ? <div className={styles.warning} role="alert">A execução mudou depois desta revisão. Revise novamente o snapshot atual.</div> : null}
      {execution.reviewedBy ? (
        <div className={styles.reviewRecord}>
          <span>{execution.reviewedBy}</span>
          <time dateTime={execution.reviewedAt}>{execution.reviewedAt?.replace("T", " ").slice(0, 16)}</time>
          {execution.reviewNote ? <p>{execution.reviewNote}</p> : null}
        </div>
      ) : null}
      {result ? (
        <div className={`${styles.notice} ${styles[result.status]}`} role={result.status === "success" ? "status" : "alert"}>
          <span>{result.message}</span>
          {result.status === "conflict" ? <button onClick={() => router.refresh()} type="button">Recarregar estado atual</button> : null}
        </div>
      ) : null}

      <form action={submit} className={styles.reviewForm}>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="requestId" type="hidden" value={execution.requestId} />
        <input name="revision" type="hidden" value={execution.requestRevision} />
        <input name="runRevision" type="hidden" value={execution.runRevision ?? ""} />
        <label>Revisor humano<input defaultValue={execution.reviewedBy ?? ""} disabled={!execution.canReview || pending} maxLength={100} name="reviewedBy" placeholder="Nome da pessoa responsável" required /></label>
        <label>Nota da revisão<textarea defaultValue={execution.reviewNote ?? ""} disabled={!execution.canReview || pending} maxLength={4000} name="reviewNote" placeholder="Obrigatória ao solicitar alterações" rows={compact ? 2 : 4} /></label>
        <div className={styles.reviewActions}>
          <button disabled={!execution.canReview || pending} name="reviewStatus" type="submit" value="approved">Aprovar execução</button>
          <button className={styles.secondaryAction} disabled={!execution.canReview || pending} name="reviewStatus" type="submit" value="changes_requested">Solicitar alterações</button>
        </div>
        <small>A decisão revisa somente esta execução. Produto, validação, documentação e score permanecem independentes.</small>
      </form>
      {!execution.canReview ? <p className={styles.disabledReason}>A revisão ficará disponível quando a solicitação estiver concluída.</p> : null}
    </section>
  )
}
