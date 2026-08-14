import type { HubGraphNodeVM } from "./types"

export interface OverviewNodePosition {
  readonly x: number
  readonly y: number
  readonly z: number
}

export function layoutOverviewNodes(nodes: readonly HubGraphNodeVM[]): ReadonlyMap<string, OverviewNodePosition> {
  const positions = new Map<string, OverviewNodePosition>()
  const hub = nodes.find((node) => node.id === "matriz-hub")
  if (hub) positions.set(hub.id, { x: 0, y: 0.55, z: 0 })
  const satellites = nodes.filter((node) => node.id !== hub?.id)
  const radius = Math.max(3.2, Math.min(5.6, 2.8 + satellites.length * 0.22))
  satellites.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, satellites.length) - Math.PI / 2
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius * 0.72,
    })
  })
  if (!hub && nodes[0]) positions.set(nodes[0].id, { x: 0, y: 0.55, z: 0 })
  return positions
}
