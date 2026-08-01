"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import type {
  DependencyHealth,
  WorkItemDependencyEdgeViewModel,
  WorkItemDependencyMapViewModel,
  WorkItemDependencyNodeViewModel,
} from "../presenters/work-item-dependency-presenter"
import type { WorkItemInspectorViewModel } from "../presenters/work-item-board-presenter"
import type { ProjectNavViewModel } from "../presenters/workspace-presenters"
import { WorkItemInspector } from "./work-item-inspector"
import boardStyles from "./work-item-board.module.css"
import styles from "./work-item-dependencies.module.css"

const HEALTH_OPTIONS: Array<["" | DependencyHealth, string]> = [
  ["", "Todos os estados"],
  ["waiting", "Aguardando"],
  ["broken", "Referência ausente"],
  ["cycle", "Ciclo"],
  ["clear", "Fluxo livre"],
]

function edgePath(
  edge: WorkItemDependencyEdgeViewModel,
  nodeById: Map<string, WorkItemDependencyNodeViewModel>,
  canvas: WorkItemDependencyMapViewModel["canvas"],
): string | undefined {
  const from = nodeById.get(edge.fromId)
  const to = nodeById.get(edge.toId)
  if (!from || !to) return undefined
  const startX = from.x + canvas.nodeWidth
  const startY = from.y + canvas.nodeHeight / 2
  const endX = to.x
  const endY = to.y + canvas.nodeHeight / 2
  if (startX < endX) {
    const bend = Math.max(36, (endX - startX) / 2)
    return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
  }
  const loopX = Math.max(startX, endX) + 34
  return `M ${startX} ${startY} C ${loopX} ${startY}, ${loopX} ${endY}, ${endX} ${endY}`
}

export function WorkItemDependencies({
  projectId,
  projectName,
  projects,
  dependencyMap,
  selected,
}: {
  projectId: string
  projectName: string
  projects: ProjectNavViewModel[]
  dependencyMap: WorkItemDependencyMapViewModel
  selected?: WorkItemInspectorViewModel
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [health, setHealth] = useState<"" | DependencyHealth>("")
  const nodeById = useMemo(
    () => new Map(dependencyMap.nodes.map((node) => [node.id, node])),
    [dependencyMap.nodes],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR")
    const nodes = dependencyMap.nodes.filter((node) => {
      if (health && node.health !== health) return false
      return !term || `${node.title} ${node.id} ${node.domain} ${node.responsible}`.toLocaleLowerCase("pt-BR").includes(term)
    })
    const visibleIds = new Set(nodes.map((node) => node.id))
    return {
      nodes,
      edges: dependencyMap.edges.filter(
        (edge) => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId),
      ),
    }
  }, [dependencyMap, health, query])

  function navigateToItem(itemId?: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (itemId) params.set("item", itemId)
    else params.delete("item")
    const suffix = params.toString()
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false })
  }

  return (
    <main className={`${styles.workspace} ${boardStyles.workspace}`}>
      <header className={styles.commandBar}>
        <label>
          Projeto
          <select onChange={(event) => router.push(`/projects/${event.target.value}/dependencies`)} value={projectId}>
            {projects.filter((project) => project.initialized).map((project) => (
              <option key={project.id} value={project.id}>{project.displayName}</option>
            ))}
          </select>
        </label>
        <label>
          Saúde
          <select onChange={(event) => setHealth(event.target.value as "" | DependencyHealth)} value={health}>
            {HEALTH_OPTIONS.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}
          </select>
        </label>
        <div className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input aria-label="Buscar no mapa de dependências" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item, domínio, responsável ou ID…" type="search" value={query} />
        </div>
        <nav aria-label="Visões do projeto">
          <Link href={`/projects/${projectId}/backlog`}>Board</Link>
          <Link href={`/projects/${projectId}/roadmap`}>Roadmap</Link>
          <span aria-current="page">Dependências</span>
          <Link href={`/projects/${projectId}/activity`}>Histórico</Link>
        </nav>
        <Link className={styles.newButton} href={`/projects/${projectId}/backlog`}>＋ Novo item</Link>
      </header>

      <div className={styles.heading}>
        <div>
          <span>Matriz Workbench / {projectId}</span>
          <h1>{projectName} · Mapa de dependências</h1>
          <p>Relações persistidas entre work items; nenhuma conexão é inferida.</p>
        </div>
        <dl className={styles.summary}>
          <div><dt>Conexões</dt><dd>{dependencyMap.summary.connections}</dd></div>
          <div><dt>Aguardando</dt><dd>{dependencyMap.summary.waiting}</dd></div>
          <div><dt>Ausentes</dt><dd>{dependencyMap.summary.broken}</dd></div>
          <div><dt>Ciclos</dt><dd>{dependencyMap.summary.cycles}</dd></div>
        </dl>
      </div>

      <div className={`${styles.content} ${selected ? styles.hasInspector : ""}`}>
        <section aria-label="Grafo de dependências" className={styles.graphViewport}>
          <div
            className={styles.graphCanvas}
            style={{ height: dependencyMap.canvas.height, width: dependencyMap.canvas.width }}
          >
            {Array.from({ length: Math.max(1, Math.ceil(dependencyMap.canvas.width / 256)) }, (_, depth) => (
              <div className={styles.depthLane} key={depth} style={{ left: depth * 256, width: 256 }}>
                <span>{depth === 0 ? "Base" : depth === 7 ? "Nível 8+" : `Nível ${depth + 1}`}</span>
              </div>
            ))}
            <svg aria-hidden="true" className={styles.edges} height={dependencyMap.canvas.height} width={dependencyMap.canvas.width}>
              <defs>
                <marker id="dependency-arrow" markerHeight="6" markerWidth="7" orient="auto" refX="6" refY="3">
                  <path d="M0,0 L0,6 L7,3 z" />
                </marker>
              </defs>
              {visible.edges.map((edge) => {
                const path = edgePath(edge, nodeById, dependencyMap.canvas)
                return path ? <path className={`${styles.edge} ${styles[edge.health]}`} d={path} key={edge.id}><title>{edge.healthLabel}</title></path> : null
              })}
            </svg>

            {visible.nodes.map((node) => {
              const position: CSSProperties = { left: node.x, top: node.y, width: dependencyMap.canvas.nodeWidth }
              const content = (
                <>
                  <span className={styles.nodeTop}><i className={`${styles.healthDot} ${styles[node.health]}`} />{node.kindLabel}<small>{node.statusLabel}</small></span>
                  <strong>{node.title}</strong>
                  <span className={styles.nodeDomain}>{node.domain}</span>
                  <span className={styles.nodeFooter}><span>{node.dependencyCount} entrada(s)</span><span>{node.dependentCount} saída(s)</span><b>{node.completion}%</b></span>
                </>
              )
              return node.missing ? (
                <div className={`${styles.node} ${styles.missingNode}`} key={node.id} style={position} title={node.id}>{content}</div>
              ) : (
                <button
                  aria-current={selected?.id === node.id ? "true" : undefined}
                  aria-label={`${node.title}. ${node.healthLabel}. ${node.statusLabel}.`}
                  className={`${styles.node} ${styles[node.health]} ${selected?.id === node.id ? styles.selectedNode : ""}`}
                  key={node.id}
                  onClick={() => navigateToItem(node.id)}
                  style={position}
                  type="button"
                >
                  {content}
                </button>
              )
            })}

            {!visible.nodes.length ? (
              <div className={styles.emptyState}>
                <h2>Nenhum item corresponde aos filtros</h2>
                <p>Limpe a busca ou selecione outro estado de saúde.</p>
                <button onClick={() => { setQuery(""); setHealth("") }} type="button">Limpar filtros</button>
              </div>
            ) : null}
          </div>
        </section>
        {selected ? <WorkItemInspector item={selected} key={selected.revision} onClose={() => navigateToItem()} projectId={projectId} /> : null}
      </div>

      <footer className={styles.legend}>
        <span><i className={styles.resolved} />Concluída</span>
        <span><i className={styles.waiting} />Aguardando</span>
        <span><i className={styles.missing} />Referência ausente</span>
        <span><i className={styles.cycle} />Ciclo</span>
        <small>{dependencyMap.summary.standalone} item(ns) sem conexões</small>
      </footer>
    </main>
  )
}
