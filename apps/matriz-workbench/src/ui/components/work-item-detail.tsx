"use client"

import Link from "next/link"
import type { KeyboardEvent } from "react"
import { useState } from "react"
import type { WorkItemDetailViewModel } from "../presenters/work-item-detail-presenter"
import { PRODUCT_STATUS_LABELS } from "../presenters/work-item-board-presenter"
import { DeliveryEvidence } from "./delivery-evidence"
import { ExecutionReviewPanel } from "./execution-review-panel"
import styles from "./work-item-detail.module.css"

type DetailTab = "overview" | "criteria" | "relations" | "executions" | "evidence" | "history"

const tabs: Array<[DetailTab, string]> = [
  ["overview", "Visão geral"],
  ["criteria", "Critérios"],
  ["relations", "Relações"],
  ["executions", "Execuções"],
  ["evidence", "Evidências"],
  ["history", "Histórico"],
]

const governanceLabels = {
  validation: "Validação",
  humanReview: "Revisão humana",
  documentation: "Documentação",
  evidence: "Evidências",
}

export function WorkItemDetail({ projectId, item }: { projectId: string; item: WorkItemDetailViewModel }) {
  const [tab, setTab] = useState<DetailTab>("overview")
  const completedCriteria = item.acceptanceCriteria.filter((criterion) => criterion.completed).length

  function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
    const nextTab = tabs[nextIndex][0]
    setTab(nextTab)
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[nextIndex]?.focus()
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.breadcrumb}><Link href={`/projects/${projectId}/backlog`}>Board</Link><span>/</span><span>{item.domain}</span><span>/</span><span>{item.id}</span></div>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.chips}><span>{item.kindLabel}</span><span className={styles[item.priority]}>{item.priorityLabel}</span></div>
            <h1>{item.title}</h1>
            <p>{item.description || "Sem descrição registrada."}</p>
          </div>
          <div className={styles.heroActions}>
            <Link href={`/projects/${projectId}/backlog?item=${encodeURIComponent(item.id)}`}>Editar no inspector</Link>
            <Link className={styles.primaryAction} href={`/projects/${projectId}/backlog`}>Voltar ao quadro</Link>
          </div>
        </div>
        <div className={styles.statusMatrix}>
          <div><span>Produto</span><strong>{PRODUCT_STATUS_LABELS[item.productStatus]}</strong></div>
          <div><span>Execução</span><strong>{item.executionStatus}</strong></div>
          <div><span>{governanceLabels.validation}</span><strong>{item.validationStatus}</strong></div>
          <div><span>{governanceLabels.humanReview}</span><strong>{item.humanReviewStatus}</strong></div>
          <div><span>{governanceLabels.documentation}</span><strong>{item.documentationStatus}</strong></div>
          <div><span>{governanceLabels.evidence}</span><strong>{item.evidenceStatus}</strong></div>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Seções do detalhe" role="tablist">
        {tabs.map(([id, label], index) => <button aria-controls={`detail-panel-${id}`} aria-selected={tab === id} className={tab === id ? styles.activeTab : ""} id={`detail-tab-${id}`} key={id} onClick={() => setTab(id)} onKeyDown={(event) => moveTabFocus(event, index)} role="tab" tabIndex={tab === id ? 0 : -1} type="button">{label}{id === "executions" && item.executions.length ? <em>{item.executions.length}</em> : null}</button>)}
      </nav>

      {tab === "overview" ? (
        <div aria-labelledby="detail-tab-overview" className={styles.overviewGrid} id="detail-panel-overview" role="tabpanel">
          <section className={styles.primarySection}>
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Resultado esperado</span><h2>Contexto operacional</h2></div><span>{item.completion}% dos critérios</span></div>
            <p className={styles.longText}>{item.description || "O item ainda não possui contexto descritivo."}</p>
            {item.blocker ? <div className={styles.blocker}><strong>Bloqueio aberto</strong><p>{item.blocker}</p></div> : null}
          </section>
          <aside className={styles.metaPanel}>
            <dl>
              <div><dt>Responsável</dt><dd>{item.responsible}</dd></div>
              <div><dt>Domínio</dt><dd>{item.domain}</dd></div>
              <div><dt>Criado</dt><dd>{item.createdAt.replace("T", " ").slice(0, 16)}</dd></div>
              <div><dt>Atualizado</dt><dd>{item.updatedAt.replace("T", " ").slice(0, 16)}</dd></div>
              <div><dt>Revisão</dt><dd><code>{item.revision}</code></dd></div>
            </dl>
            <div className={styles.tags}>{item.tags.map((tag) => <span key={tag}>{tag}</span>)}{!item.tags.length ? <small>Sem tags</small> : null}</div>
          </aside>
        </div>
      ) : null}

      {tab === "criteria" ? (
        <section aria-labelledby="detail-tab-criteria" className={styles.contentSection} id="detail-panel-criteria" role="tabpanel">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Contrato de conclusão</span><h2>Critérios de aceite</h2></div><span>{completedCriteria}/{item.acceptanceCriteria.length}</span></div>
          <div className={styles.criteriaList}>{item.acceptanceCriteria.map((criterion) => <div className={criterion.completed ? styles.criterionDone : ""} key={criterion.id}><i>{criterion.completed ? "✓" : "○"}</i><span>{criterion.text}</span></div>)}{!item.acceptanceCriteria.length ? <p className={styles.empty}>Nenhum critério definido.</p> : null}</div>
        </section>
      ) : null}

      {tab === "relations" ? (
        <section aria-labelledby="detail-tab-relations" className={styles.contentSection} id="detail-panel-relations" role="tabpanel">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Rastreabilidade</span><h2>Hierarquia e dependências</h2></div><span>{item.relations.length}</span></div>
          <div className={styles.relationList}>{item.relations.map((relation) => <Link href={`/projects/${projectId}/backlog/${relation.id}`} key={`${relation.relation}-${relation.id}`}><span>{relation.relation}</span><strong>{relation.title}</strong><em>{PRODUCT_STATUS_LABELS[relation.status]}</em></Link>)}{!item.relations.length ? <p className={styles.empty}>Nenhuma relação persistida.</p> : null}</div>
        </section>
      ) : null}

      {tab === "executions" ? (
        <section aria-labelledby="detail-tab-executions" className={styles.executionSection} id="detail-panel-executions" role="tabpanel">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Humano + Codex</span><h2>Execuções vinculadas</h2></div><span>{item.executions.length}</span></div>
          {item.executions.map((execution) => <article className={styles.executionCard} key={execution.requestId}><header><div><span>{execution.requestId}</span><h3>{execution.title}</h3><p>{execution.claimedBy} · {execution.runStatus ?? execution.requestStatus}</p></div><Link href={`/projects/${projectId}/agents/${execution.requestId}`}>Abrir console e diff</Link></header><p className={styles.resultSummary}>{execution.resultSummary}</p><div className={styles.evidenceColumns}><div><strong>Checks</strong>{execution.checks.map((check) => <code key={check}>{check}</code>)}{!execution.checks.length ? <span>Sem checks</span> : null}</div><div><strong>Arquivos</strong>{execution.changedFiles.map((file) => <code key={file}>{file}</code>)}{!execution.changedFiles.length ? <span>Sem arquivos</span> : null}</div></div><ExecutionReviewPanel compact execution={execution} projectId={projectId} /></article>)}
          {!item.executions.length ? <p className={styles.empty}>Nenhuma execução foi vinculada a este produto.</p> : null}
        </section>
      ) : null}

      {tab === "evidence" ? <div aria-labelledby="detail-tab-evidence" id="detail-panel-evidence" role="tabpanel"><DeliveryEvidence evidence={item.evidence} projectId={projectId} /></div> : null}

      {tab === "history" ? (
        <section aria-labelledby="detail-tab-history" className={styles.contentSection} id="detail-panel-history" role="tabpanel">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Proveniência</span><h2>Histórico consolidado</h2></div><span>{item.fullHistory.length}</span></div>
          <ol className={styles.history}>{item.fullHistory.map((event) => <li key={event.id}><i /><time dateTime={event.occurredAt}>{event.occurredAt.replace("T", " ").slice(0, 16)}</time><div><strong>{event.summary}</strong><span>{event.actor} · {event.action}</span></div></li>)}{!item.fullHistory.length ? <p className={styles.empty}>Nenhum evento relacionado.</p> : null}</ol>
        </section>
      ) : null}
    </main>
  )
}
