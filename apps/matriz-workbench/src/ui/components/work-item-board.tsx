"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { createWorkItemAction, moveWorkItemAction, type WorkItemMutationResult } from "../../../app/actions"
import type { ProjectNavViewModel } from "../presenters/workspace-presenters"
import {
  BOARD_STATUSES,
  PRODUCT_STATUS_LABELS,
  type WorkItemBoardViewModel,
  type WorkItemCardViewModel,
  type WorkItemInspectorViewModel,
} from "../presenters/work-item-board-presenter"
import { WorkItemInspector } from "./work-item-inspector"
import styles from "./work-item-board.module.css"

function moveTargets(status: WorkItemCardViewModel["productStatus"]) {
  const index = BOARD_STATUSES.indexOf(status as (typeof BOARD_STATUSES)[number])
  if (index < 0) return []
  return [BOARD_STATUSES[index - 1], BOARD_STATUSES[index + 1]].filter(Boolean)
}

export function WorkItemBoard({
  projectId,
  projectName,
  projects,
  initialBoard,
  selected,
}: {
  projectId: string
  projectName: string
  projects: ProjectNavViewModel[]
  initialBoard: WorkItemBoardViewModel
  selected?: WorkItemInspectorViewModel
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [board, setBoard] = useState(initialBoard)
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [domain, setDomain] = useState(searchParams.get("domain") ?? "")
  const [composerOpen, setComposerOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string>()
  const [dragOver, setDragOver] = useState<string>()
  const [notice, setNotice] = useState<WorkItemMutationResult>()
  const [pending, startTransition] = useTransition()

  useEffect(() => setBoard(initialBoard), [initialBoard])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR")
    return {
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        items: column.items.filter((item) => {
          if (domain && item.domain !== domain) return false
          return !term || `${item.title} ${item.kindLabel} ${item.domain} ${item.responsible}`.toLocaleLowerCase("pt-BR").includes(term)
        }),
      })),
    }
  }, [board, domain, query])
  const draggedItem = draggedId
    ? board.columns.flatMap((column) => column.items).find((item) => item.id === draggedId)
    : undefined
  const validDropTargets = draggedItem ? moveTargets(draggedItem.productStatus) : []

  function navigateToItem(itemId?: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (itemId) params.set("item", itemId)
    else params.delete("item")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function optimisticMove(itemId: string, target: string) {
    const original = board
    const source = board.columns.flatMap((column) => column.items).find((item) => item.id === itemId)
    if (!source || !moveTargets(source.productStatus).includes(target as never)) return
    setBoard({
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        items: column.id === target
          ? [...column.items, { ...source, productStatus: target as WorkItemCardViewModel["productStatus"] }]
          : column.items.filter((item) => item.id !== itemId),
      })),
    })
    setNotice(undefined)
    startTransition(async () => {
      const result = await moveWorkItemAction(projectId, source.id, target, source.revision)
      setNotice(result)
      if (result.status === "success") router.refresh()
      else setBoard(original)
      if (result.status !== "success") navigateToItem(source.id)
    })
  }

  function create(formData: FormData) {
    setNotice(undefined)
    startTransition(async () => {
      const result = await createWorkItemAction(formData)
      setNotice(result)
      if (result.status === "success") {
        setComposerOpen(false)
        navigateToItem(result.itemId)
        router.refresh()
      }
    })
  }

  return (
    <main className={`${styles.workspace} work-item-board-route`}>
      <header className={styles.commandBar}>
        <div className={styles.projectPicker}>
          <label htmlFor="board-project">Projeto</label>
          <select id="board-project" onChange={(event) => router.push(`/projects/${event.target.value}/backlog`)} value={projectId}>
            {projects.filter((project) => project.initialized).map((project) => <option key={project.id} value={project.id}>{project.displayName}</option>)}
          </select>
        </div>
        <div className={styles.filterField}>
          <label htmlFor="board-domain">Domínio</label>
          <select id="board-domain" onChange={(event) => setDomain(event.target.value)} value={domain}>
            <option value="">Todos os domínios</option>
            {board.domains.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className={styles.searchField}>
          <span aria-hidden="true">⌕</span>
          <input aria-label="Buscar work items" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item, domínio ou responsável…" type="search" value={query} />
          <kbd>⌘K</kbd>
        </div>
        <nav className={styles.viewTabs} aria-label="Visões do projeto">
          <span aria-current="page">Board</span>
          <Link href={`/projects/${projectId}/roadmap`}>Roadmap</Link>
          <Link href={`/projects/${projectId}/dependencies`}>Dependências</Link>
          <Link href={`/projects/${projectId}/activity`}>Histórico</Link>
        </nav>
        <button className={styles.newButton} onClick={() => setComposerOpen(true)} type="button"><span>＋</span>Novo item</button>
      </header>

      <div className={styles.boardHeading}>
        <div><span className={styles.eyebrow}>Matriz Workbench / {projectId}</span><h1>{projectName} · Quadro operacional</h1></div>
        <span>{filtered.columns.reduce((total, column) => total + column.items.length, 0)} de {board.total} itens</span>
      </div>

      {notice ? <div className={`${styles.boardNotice} ${styles[notice.status]}`} role={notice.status === "success" ? "status" : "alert"}>{notice.message}</div> : null}
      <div className={styles.srStatus} aria-live="polite">{draggedId ? `Arrastando ${draggedId}` : pending ? "Salvando alteração" : ""}</div>

      <div className={`${styles.content} ${selected ? styles.hasInspector : ""}`}>
        <section className={styles.board} aria-label="Quadro de work items">
          {filtered.columns.map((column) => (
            <section
              className={`${styles.column} ${dragOver === column.id ? styles.dropActive : ""} ${draggedId && !validDropTargets.includes(column.id as never) ? styles.dropDisabled : ""}`}
              key={column.id}
              onDragEnter={(event) => {
                if (validDropTargets.includes(column.id as never)) {
                  event.preventDefault()
                  setDragOver(column.id)
                }
              }}
              onDragOver={(event) => {
                if (validDropTargets.includes(column.id as never)) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                } else {
                  event.dataTransfer.dropEffect = "none"
                }
              }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(undefined) }}
              onDrop={(event) => {
                event.preventDefault()
                const itemId = event.dataTransfer.getData("text/work-item") || draggedId
                setDragOver(undefined)
                setDraggedId(undefined)
                if (itemId && validDropTargets.includes(column.id as never)) optimisticMove(itemId, column.id)
              }}
            >
              <header className={styles.columnHeader}><div><i className={styles[column.id]} /><h2>{column.title}</h2></div><span>{column.items.length}</span></header>
              <div className={styles.cardList}>
                {column.items.map((item) => (
                  <article
                    aria-current={selected?.id === item.id ? "true" : undefined}
                    className={`${styles.card} ${selected?.id === item.id ? styles.selectedCard : ""} ${draggedId === item.id ? styles.dragging : ""}`}
                    draggable={!pending}
                    key={item.id}
                    onClick={() => navigateToItem(item.id)}
                    onDragEnd={() => { setDraggedId(undefined); setDragOver(undefined) }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData("text/work-item", item.id)
                      setDraggedId(item.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        navigateToItem(item.id)
                      }
                    }}
                    tabIndex={0}
                  >
                    <div className={styles.cardMeta}><span>{item.domain}</span>{item.blocker ? <span className={styles.blocked}>Bloqueado</span> : null}</div>
                    <h3>{item.title}</h3>
                    <p>{item.kindLabel} · {item.responsible}</p>
                    <div className={styles.chipRow}><span className={styles.kindChip}>{item.kindLabel}</span><span className={`${styles.priorityChip} ${styles[item.priority]}`}>{item.priorityLabel}</span></div>
                    {item.executionStatus !== "none" ? <div className={styles.executionBand}><span>Execução</span><strong>{item.executionStatus}</strong></div> : null}
                    <footer className={styles.cardFooter}>
                      <span title="Critérios">✓ {item.completion}%</span><span title="Evidências">◇ {item.referenceCount}</span>
                      <select
                        aria-label={`Mover ${item.title}`}
                        disabled={pending}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => { if (event.target.value) optimisticMove(item.id, event.target.value); event.target.value = "" }}
                        defaultValue=""
                      >
                        <option value="">Mover…</option>
                        {moveTargets(item.productStatus).map((target) => <option key={target} value={target}>{PRODUCT_STATUS_LABELS[target]}</option>)}
                      </select>
                    </footer>
                  </article>
                ))}
                {!column.items.length ? <div className={styles.columnEmpty}><span>Sem itens</span><small>Arraste um item elegível ou crie trabalho.</small></div> : null}
              </div>
            </section>
          ))}
        </section>
        {selected ? <WorkItemInspector key={selected.revision} item={selected} onClose={() => navigateToItem()} parentOptions={initialBoard.columns.flatMap((column) => column.items).flatMap((item) => item.id !== selected.id && (item.kind === "outcome" || item.kind === "task") ? [{ id: item.id, kind: item.kind, title: item.title }] : [])} projectId={projectId} /> : null}
      </div>

      {composerOpen ? (
        <div className={styles.composerBackdrop} onKeyDown={(event) => { if (event.key === "Escape") setComposerOpen(false) }} onMouseDown={(event) => { if (event.target === event.currentTarget) setComposerOpen(false) }}>
          <section aria-labelledby="new-work-item-title" aria-modal="true" className={styles.composer} role="dialog">
            <header><div><span className={styles.eyebrow}>Captura direta no projeto</span><h2 id="new-work-item-title">Criar work item</h2></div><button aria-label="Fechar" onClick={() => setComposerOpen(false)} type="button">×</button></header>
            <form action={create}>
              <input name="projectId" type="hidden" value={projectId} />
              <label>Título<input autoFocus name="title" required /></label>
              <div className={styles.fieldGrid}><label>Tipo<select defaultValue="feature" name="kind"><option value="outcome">Outcome</option><option value="feature">Feature</option><option value="task">Task</option><option value="bug">Bug</option></select></label><label>Prioridade<select defaultValue="medium" name="priority"><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label></div>
              <p className={styles.emptyText}>Contexto, critérios, relações, responsável e evidências serão revelados no inspector conforme o trabalho avançar.</p>
              <footer><button className={styles.secondaryButton} onClick={() => setComposerOpen(false)} type="button">Cancelar</button><button className={styles.primaryButton} disabled={pending} type="submit">{pending ? "Criando…" : "Criar item"}</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
