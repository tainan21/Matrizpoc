import type { ProductStatus, WorkItem } from "../../domain/schemas"
import { PRODUCT_STATUS_LABELS } from "./work-item-board-presenter"

export type DependencyHealth = "clear" | "waiting" | "broken" | "cycle"
export type DependencyEdgeHealth = "resolved" | "waiting" | "missing" | "cycle"

export interface WorkItemDependencyNodeViewModel {
  id: string
  title: string
  kind?: WorkItem["kind"]
  kindLabel: string
  productStatus?: ProductStatus
  statusLabel: string
  priorityLabel: string
  domain: string
  responsible: string
  health: DependencyHealth
  healthLabel: string
  dependencyCount: number
  dependentCount: number
  completion: number
  depth: number
  x: number
  y: number
  missing: boolean
}

export interface WorkItemDependencyEdgeViewModel {
  id: string
  fromId: string
  toId: string
  health: DependencyEdgeHealth
  healthLabel: string
}

export interface WorkItemDependencyMapViewModel {
  nodes: WorkItemDependencyNodeViewModel[]
  edges: WorkItemDependencyEdgeViewModel[]
  summary: {
    items: number
    connections: number
    waiting: number
    broken: number
    cycles: number
    standalone: number
  }
  canvas: { width: number; height: number; nodeWidth: number; nodeHeight: number }
}

const HEALTH_LABELS: Record<DependencyHealth, string> = {
  clear: "Fluxo livre",
  waiting: "Aguardando dependência",
  broken: "Referência ausente",
  cycle: "Ciclo detectado",
}

const EDGE_LABELS: Record<DependencyEdgeHealth, string> = {
  resolved: "Dependência concluída",
  waiting: "Dependência não concluída",
  missing: "Referência ausente",
  cycle: "Participa de um ciclo",
}

const KIND_LABELS: Record<WorkItem["kind"], string> = {
  outcome: "Outcome",
  feature: "Feature",
  task: "Task",
  bug: "Bug",
}

const PRIORITY_LABELS: Record<WorkItem["priority"], string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

function cycleComponents(items: WorkItem[]): { componentById: Map<string, number>; count: number } {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const indexById = new Map<string, number>()
  const lowLinkById = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const components: string[][] = []
  let index = 0

  function visit(id: string) {
    indexById.set(id, index)
    lowLinkById.set(id, index)
    index += 1
    stack.push(id)
    onStack.add(id)

    const item = itemById.get(id)
    for (const dependencyId of item?.dependencyIds ?? []) {
      if (!itemById.has(dependencyId)) continue
      if (!indexById.has(dependencyId)) {
        visit(dependencyId)
        lowLinkById.set(id, Math.min(lowLinkById.get(id) ?? 0, lowLinkById.get(dependencyId) ?? 0))
      } else if (onStack.has(dependencyId)) {
        lowLinkById.set(id, Math.min(lowLinkById.get(id) ?? 0, indexById.get(dependencyId) ?? 0))
      }
    }

    if (lowLinkById.get(id) !== indexById.get(id)) return
    const component: string[] = []
    let member = ""
    do {
      member = stack.pop() ?? ""
      onStack.delete(member)
      if (member) component.push(member)
    } while (member && member !== id)
    components.push(component)
  }

  for (const item of items) {
    if (!indexById.has(item.id)) visit(item.id)
  }

  const cyclic = components.filter((component) => {
    if (component.length > 1) return true
    const item = itemById.get(component[0])
    return item?.dependencyIds.includes(component[0]) ?? false
  })
  const componentById = new Map<string, number>()
  cyclic.forEach((component, componentIndex) => {
    component.forEach((id) => componentById.set(id, componentIndex))
  })
  return { componentById, count: cyclic.length }
}

export function toWorkItemDependencyMapViewModel(items: WorkItem[]): WorkItemDependencyMapViewModel {
  const activeItems = items.filter((item) => item.productStatus !== "archived")
  const allItemById = new Map(items.map((item) => [item.id, item]))
  const referencedArchivedIds = new Set(
    activeItems
      .flatMap((item) => item.dependencyIds)
      .filter((dependencyId) => allItemById.get(dependencyId)?.productStatus === "archived"),
  )
  const graphItems = [
    ...activeItems,
    ...items.filter((item) => item.productStatus === "archived" && referencedArchivedIds.has(item.id)),
  ]
  const itemById = new Map(graphItems.map((item) => [item.id, item]))
  const missingIds = new Set(
    activeItems.flatMap((item) => item.dependencyIds).filter((dependencyId) => !allItemById.has(dependencyId)),
  )
  const { componentById, count: cycleCount } = cycleComponents(activeItems)

  const edges: WorkItemDependencyEdgeViewModel[] = activeItems.flatMap((item) =>
    item.dependencyIds.map((dependencyId, edgeIndex) => {
      const dependency = itemById.get(dependencyId)
      const sameCycle =
        componentById.has(item.id) && componentById.get(item.id) === componentById.get(dependencyId)
      const health: DependencyEdgeHealth = !dependency
        ? "missing"
        : sameCycle
          ? "cycle"
          : dependency.productStatus === "completed"
            ? "resolved"
            : "waiting"
      return {
        id: `${dependencyId}:${item.id}:${edgeIndex}`,
        fromId: dependencyId,
        toId: item.id,
        health,
        healthLabel: EDGE_LABELS[health],
      }
    }),
  )

  const depthCache = new Map<string, number>()
  function depthFor(id: string, visiting = new Set<string>()): number {
    const cached = depthCache.get(id)
    if (cached !== undefined) return cached
    const item = itemById.get(id)
    if (!item || visiting.has(id) || componentById.has(id)) return 0
    const nextVisiting = new Set(visiting).add(id)
    const dependencies = item.dependencyIds.filter(
      (dependencyId) => itemById.has(dependencyId) && !componentById.has(dependencyId),
    )
    const depth = dependencies.length
      ? Math.min(7, Math.max(...dependencies.map((dependencyId) => depthFor(dependencyId, nextVisiting) + 1)))
      : 0
    depthCache.set(id, depth)
    return depth
  }

  const dependentCount = new Map<string, number>()
  edges.forEach((edge) => dependentCount.set(edge.fromId, (dependentCount.get(edge.fromId) ?? 0) + 1))

  const baseNodes: WorkItemDependencyNodeViewModel[] = graphItems.map((item) => {
    const hasCycle = componentById.has(item.id)
    const hasMissing = item.dependencyIds.some((dependencyId) => !itemById.has(dependencyId))
    const hasWaiting = item.dependencyIds.some((dependencyId) => {
      const dependency = itemById.get(dependencyId)
      return dependency && dependency.productStatus !== "completed"
    })
    const health: DependencyHealth = hasCycle
      ? "cycle"
      : hasMissing
        ? "broken"
        : hasWaiting
          ? "waiting"
          : "clear"
    const completedCriteria = item.acceptanceCriteria.filter((criterion) => criterion.completed).length
    return {
      id: item.id,
      title: item.title,
      kind: item.kind,
      kindLabel: KIND_LABELS[item.kind],
      productStatus: item.productStatus,
      statusLabel: PRODUCT_STATUS_LABELS[item.productStatus],
      priorityLabel: PRIORITY_LABELS[item.priority],
      domain: item.domain ?? "Sem domínio",
      responsible: item.responsible ?? "Não atribuído",
      health,
      healthLabel: HEALTH_LABELS[health],
      dependencyCount: item.dependencyIds.length,
      dependentCount: dependentCount.get(item.id) ?? 0,
      completion: item.acceptanceCriteria.length
        ? Math.round((completedCriteria / item.acceptanceCriteria.length) * 100)
        : 0,
      depth: depthFor(item.id),
      x: 0,
      y: 0,
      missing: false,
    }
  })

  for (const missingId of missingIds) {
    baseNodes.push({
      id: missingId,
      title: "Work item não encontrado",
      kindLabel: "Referência",
      statusLabel: "Ausente",
      priorityLabel: "—",
      domain: "Referência quebrada",
      responsible: "Corrigir vínculo",
      health: "broken",
      healthLabel: HEALTH_LABELS.broken,
      dependencyCount: 0,
      dependentCount: dependentCount.get(missingId) ?? 0,
      completion: 0,
      depth: 0,
      x: 0,
      y: 0,
      missing: true,
    })
  }

  const healthOrder: Record<DependencyHealth, number> = { cycle: 0, broken: 1, waiting: 2, clear: 3 }
  const lanes = new Map<number, WorkItemDependencyNodeViewModel[]>()
  baseNodes.forEach((node) => {
    const lane = lanes.get(node.depth) ?? []
    lane.push(node)
    lanes.set(node.depth, lane)
  })

  const nodeWidth = 218
  const nodeHeight = 88
  const positioned = Array.from(lanes.entries()).flatMap(([depth, nodes]) =>
    [...nodes]
      .sort((left, right) =>
        healthOrder[left.health] - healthOrder[right.health] || left.title.localeCompare(right.title, "pt-BR"),
      )
      .map((node, row) => ({ ...node, x: 28 + depth * 256, y: 28 + row * 116 })),
  )
  const maxDepth = Math.max(0, ...positioned.map((node) => node.depth))
  const maxRows = Math.max(1, ...Array.from(lanes.values()).map((lane) => lane.length))
  const standalone = activeItems.filter(
    (item) => item.dependencyIds.length === 0 && (dependentCount.get(item.id) ?? 0) === 0,
  ).length

  return {
    nodes: positioned,
    edges,
    summary: {
      items: activeItems.length,
      connections: edges.length,
      waiting: edges.filter((edge) => edge.health === "waiting").length,
      broken: edges.filter((edge) => edge.health === "missing").length,
      cycles: cycleCount,
      standalone,
    },
    canvas: {
      width: Math.max(960, 64 + (maxDepth + 1) * 256),
      height: Math.max(480, 56 + maxRows * 116),
      nodeWidth,
      nodeHeight,
    },
  }
}
