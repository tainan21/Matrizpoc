"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import {
  addWorkItemReferenceAction,
  createAgentRequestAction,
  saveWorkItemAction,
  type WorkItemMutationResult,
} from "../../../app/actions"
import type { WorkItemInspectorViewModel } from "../presenters/work-item-board-presenter"
import { PRODUCT_STATUS_LABELS } from "../presenters/work-item-board-presenter"
import { DeliveryEvidence } from "./delivery-evidence"
import styles from "./work-item-board.module.css"

type Tab = "overview" | "criteria" | "context" | "execution" | "evidence" | "history"

const tabs: Array<[Tab, string]> = [
  ["overview", "Visão geral"],
  ["criteria", "Critérios"],
  ["context", "Contexto"],
  ["execution", "Execução"],
  ["evidence", "Evidências"],
  ["history", "Histórico"],
]

function StateNotice({ result }: { result?: WorkItemMutationResult }) {
  if (!result) return null
  return (
    <div
      className={`${styles.notice} ${result.status === "conflict" ? styles.conflict : result.status === "error" ? styles.error : styles.success}`}
      role={result.status === "success" ? "status" : "alert"}
    >
      {result.message}
    </div>
  )
}

export function WorkItemInspector({
  projectId,
  item,
  onClose,
  parentOptions = [],
}: {
  projectId: string
  item: WorkItemInspectorViewModel
  onClose: () => void
  parentOptions?: Array<{ id: string; kind: "outcome" | "task"; title: string }>
}) {
  const router = useRouter()
  const closeButton = useRef<HTMLButtonElement>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [result, setResult] = useState<WorkItemMutationResult>()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      const target = event.target as HTMLElement | null
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return
      if (event.key.toLowerCase() === "r") setTab("context")
      if (event.key.toLowerCase() === "e") setTab("execution")
      if (event.key.toLowerCase() === "v") setTab("evidence")
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  function submit(action: (formData: FormData) => Promise<WorkItemMutationResult>, formData: FormData) {
    setResult(undefined)
    startTransition(async () => {
      const next = await action(formData)
      setResult(next)
      if (next.status === "success") router.refresh()
    })
  }

  return (
    <aside className={styles.inspector} aria-label={`Inspector de ${item.title}`}>
      <header className={styles.inspectorHeader}>
        <div>
          <span className={styles.breadcrumb}>{item.domain} / {item.kindLabel}</span>
          <h2>{item.title}</h2>
          <div className={styles.chipRow}>
            <span className={styles.kindChip}>{item.kindLabel}</span>
            <span className={`${styles.priorityChip} ${styles[item.priority]}`}>{item.priorityLabel}</span>
            <Link className={styles.detailLink} href={`/projects/${projectId}/backlog/${item.id}`}>Abrir detalhe completo</Link>
          </div>
        </div>
        <button className={styles.iconButton} aria-label="Fechar inspector" onClick={onClose} ref={closeButton} type="button">×</button>
      </header>

      <nav className={styles.inspectorTabs} aria-label="Seções do work item" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            aria-selected={tab === id}
            className={tab === id ? styles.activeTab : ""}
            key={id}
            onClick={() => setTab(id)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <StateNotice result={result} />

      {(["overview", "criteria", "context"] as Tab[]).includes(tab) ? (
        <form action={(formData) => submit(saveWorkItemAction, formData)} className={styles.inspectorForm}>
          <input name="projectId" type="hidden" value={projectId} />
          <input name="itemId" type="hidden" value={item.id} />
          <input name="revision" type="hidden" value={item.revision} />

          <section aria-labelledby="overview-tab" hidden={tab !== "overview"}>
            <label>Título<input name="title" defaultValue={item.title} maxLength={180} required /></label>
            <div className={styles.fieldGrid}>
              <label>Tipo<select name="kind" defaultValue={item.kind}><option value="outcome">Outcome</option><option value="feature">Feature</option><option value="task">Task</option><option value="bug">Bug</option></select></label>
              <label>Prioridade<select name="priority" defaultValue={item.priority}><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
            </div>
            <label>Estado do produto<select name="productStatus" defaultValue={item.productStatus}>{Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>
              Motivo do arquivamento
              <span className={styles.fieldHint}>obrigatório somente ao escolher Arquivado</span>
              <input defaultValue={item.archiveReason ?? ""} name="archiveReason" />
            </label>
            <div className={styles.fieldGrid}>
              <label>Domínio<input name="domain" defaultValue={item.domain === "Sem domínio" ? "" : item.domain} /></label>
              <label>Responsável<input name="responsible" defaultValue={item.responsible === "Não atribuído" ? "" : item.responsible} /></label>
            </div>
            <label>Validação<select name="validationStatus" defaultValue={item.validationStatus}><option value="not_required">Não exigida</option><option value="pending">Pendente</option><option value="running">Em execução</option><option value="passed">Aprovada</option><option value="failed">Falhou</option><option value="waived">Dispensada</option></select></label>
            <label>Revisão humana<select name="humanReviewStatus" defaultValue={item.humanReviewStatus}><option value="not_required">Não exigida</option><option value="pending">Pendente</option><option value="approved">Aprovada</option><option value="changes_requested">Alterações solicitadas</option></select></label>
            <label>Documentação<select name="documentationStatus" defaultValue={item.documentationStatus}><option value="not_required">Não exigida</option><option value="pending">Pendente</option><option value="current">Atualizada</option><option value="stale">Desatualizada</option></select></label>
          </section>

          <section hidden={tab !== "criteria"}>
            <div className={styles.sectionTitle}><strong>Critérios de aceite</strong><span>{item.completion}%</span></div>
            <div className={styles.criteriaList}>
              {item.acceptanceCriteria.map((criterion) => (
                <label className={styles.criterion} key={criterion.id}>
                  <input defaultChecked={criterion.completed} name={`criterion:${criterion.id}`} type="checkbox" />
                  <span>{criterion.text}</span>
                </label>
              ))}
              {!item.acceptanceCriteria.length ? <p className={styles.emptyText}>Nenhum critério definido.</p> : null}
            </div>
            <label>
              Editar critérios
              <span className={styles.fieldHint}>um por linha; itens novos iniciam pendentes</span>
              <textarea
                defaultValue={item.acceptanceCriteria.map((criterion) => criterion.text).join("\n")}
                name="acceptanceCriteria"
                rows={6}
              />
            </label>
          </section>

          <section hidden={tab !== "context"}>
            <label>Descrição<textarea defaultValue={item.description} name="description" rows={8} /></label>
            <label>Tags<input defaultValue={item.tags.join(", ")} name="tags" /></label>
            <label>Dependências<textarea defaultValue={item.dependencyIds.join("\n")} name="dependencyIds" rows={3} /></label>
            <label>Outcome ou Task pai<select defaultValue={item.parentId ?? ""} name="parentId"><option value="">Sem pai</option>{parentOptions.map((option) => <option key={option.id} value={option.id}>{option.kind === "outcome" ? "Outcome" : "Task"} · {option.title}</option>)}</select></label>
            {item.originLabel ? <p className={styles.fieldHint}>Origem permanente: {item.originLabel}</p> : null}
            <label>Bloqueio<textarea defaultValue={item.blocker ?? ""} name="blockerSummary" rows={3} /></label>
            <label>Status do bloqueio<select defaultValue={item.blocker ? "open" : "resolved"} name="blockerStatus"><option value="open">Aberto</option><option value="resolved">Resolvido</option></select></label>
          </section>

          {tab !== "overview" ? <input name="title" type="hidden" value={item.title} /> : null}
          {tab !== "overview" ? <input name="kind" type="hidden" value={item.kind} /> : null}
          {tab !== "overview" ? <input name="priority" type="hidden" value={item.priority} /> : null}
          {tab !== "overview" ? <input name="productStatus" type="hidden" value={item.productStatus} /> : null}
          {tab !== "overview" ? <input name="domain" type="hidden" value={item.domain === "Sem domínio" ? "" : item.domain} /> : null}
          {tab !== "overview" ? <input name="responsible" type="hidden" value={item.responsible === "Não atribuído" ? "" : item.responsible} /> : null}
          {tab !== "overview" ? <input name="validationStatus" type="hidden" value={item.validationStatus} /> : null}
          {tab !== "overview" ? <input name="humanReviewStatus" type="hidden" value={item.humanReviewStatus} /> : null}
          {tab !== "overview" ? <input name="documentationStatus" type="hidden" value={item.documentationStatus} /> : null}
          {tab !== "overview" ? <input name="archiveReason" type="hidden" value={item.archiveReason ?? ""} /> : null}
          {tab !== "context" ? <input name="description" type="hidden" value={item.description} /> : null}
          {tab !== "context" ? <input name="tags" type="hidden" value={item.tags.join(", ")} /> : null}
          {tab !== "context" ? <input name="dependencyIds" type="hidden" value={item.dependencyIds.join("\n")} /> : null}
          {tab !== "context" ? <input name="parentId" type="hidden" value={item.parentId ?? ""} /> : null}
          {tab !== "context" ? <input name="blockerSummary" type="hidden" value={item.blocker ?? ""} /> : null}
          {tab !== "context" ? <input name="blockerStatus" type="hidden" value={item.blocker ? "open" : "resolved"} /> : null}
          {tab !== "criteria" ? item.acceptanceCriteria.filter((criterion) => criterion.completed).map((criterion) => <input key={criterion.id} name={`criterion:${criterion.id}`} type="hidden" value="on" />) : null}
          {tab !== "criteria" ? <input name="acceptanceCriteria" type="hidden" value={item.acceptanceCriteria.map((criterion) => criterion.text).join("\n")} /> : null}

          <div className={styles.inspectorActions}>
            <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar alterações"}</button>
          </div>
        </form>
      ) : null}

      {tab === "execution" ? (
        <section className={styles.inspectorSection}>
          <div className={styles.stateMatrix}>
            <div><span>Produto</span><strong>{PRODUCT_STATUS_LABELS[item.productStatus]}</strong></div>
            <div><span>Execução</span><strong>{item.executionStatus}</strong></div>
            <div><span>Revisão humana</span><strong>{item.humanReviewStatus}</strong></div>
          </div>
          {item.evidence.runs.map((run) => (
            <article className={styles.executionRow} key={run.requestId}>
              <div><strong>{run.title}</strong><span>{run.claimedBy ?? "agente não atribuído"}</span></div>
              <span>{run.runStatus ?? run.requestStatus}</span>
              <Link href={`/projects/${projectId}/agents/${run.requestId}`}>Abrir execução</Link>
            </article>
          ))}
          {!item.evidence.runs.length ? <p className={styles.emptyText}>Nenhuma execução vinculada. O estado do produto permanece independente.</p> : null}
          <form action={createAgentRequestAction} className={styles.referenceForm}>
            <input name="projectId" type="hidden" value={projectId} />
            <input name="backlogItemId" type="hidden" value={item.id} />
            <label>
              Instruções adicionais
              <span className={styles.fieldHint}>tipo, contexto, parent, sprint e critérios são herdados automaticamente</span>
              <textarea name="instructions" placeholder="Opcional: limite, arquivo ou cuidado específico" rows={4} />
            </label>
            <button className={styles.primaryButton} type="submit">Criar solicitação Codex</button>
          </form>
        </section>
      ) : null}

      {tab === "evidence" ? (
        <section className={styles.inspectorSection}>
          <DeliveryEvidence evidence={item.evidence} projectId={projectId} variant="compact" />
          <form action={(formData) => submit(addWorkItemReferenceAction, formData)} className={styles.referenceForm}>
            <input name="projectId" type="hidden" value={projectId} /><input name="itemId" type="hidden" value={item.id} /><input name="revision" type="hidden" value={item.revision} />
            <label>Tipo<select name="referenceKind"><option value="repository_file">Arquivo</option><option value="external_url">URL</option><option value="workbench_document">Documento</option></select></label>
            <label>Referência<input name="referenceValue" required /></label>
            <label>Rótulo<input name="referenceLabel" /></label>
            <button className={styles.secondaryButton} disabled={pending} type="submit">Vincular evidência</button>
          </form>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className={styles.inspectorSection}>
          <ol className={styles.historyList}>
            {item.history.map((event) => (
              <li key={event.id}><i /><div><strong>{event.summary}</strong><span>{event.actor} · {new Date(event.occurredAt).toLocaleString("pt-BR")}</span></div></li>
            ))}
          </ol>
          {!item.history.length ? <p className={styles.emptyText}>Nenhum evento permanente para este item.</p> : null}
        </section>
      ) : null}
    </aside>
  )
}
