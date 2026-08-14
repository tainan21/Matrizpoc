"use client"

import type { CSSProperties } from "react"
import { HubIcon } from "./icons"
import type { HubGraphEdgeVM, HubGraphNodeVM } from "./types"

const POINTS = [
  [50, 48], [25, 20], [50, 15], [75, 22], [82, 52], [68, 78], [39, 82], [16, 58],
] as const

function pointFor(index: number, isHub: boolean): readonly [number, number] {
  return isHub ? [50, 48] : POINTS[(index % (POINTS.length - 1)) + 1]
}

export function OverviewMapFallback({ nodes, edges, selectedId, onSelect }: {
  readonly nodes: readonly HubGraphNodeVM[]
  readonly edges: readonly HubGraphEdgeVM[]
  readonly selectedId?: string
  readonly onSelect: (id: string) => void
}) {
  const positions = new Map<string, readonly [number, number]>()
  nodes.forEach((node, index) => positions.set(node.id, pointFor(index, node.id === "matriz-hub")))
  return (
    <div className="hub-map-2d" aria-label="Mapa 2D das integrações registradas">
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs><filter id="hub-edge-glow"><feGaussianBlur stdDeviation=".35" /></filter></defs>
        {edges.map((edge) => {
          const source = positions.get(edge.sourceId)
          const target = positions.get(edge.targetId)
          return source && target ? <line key={edge.id} x1={source[0]} y1={source[1]} x2={target[0]} y2={target[1]} /> : null
        })}
      </svg>
      {nodes.map((node, index) => {
        const point = positions.get(node.id) ?? [50, 50]
        return (
          <button
            aria-pressed={selectedId === node.id}
            className="hub-map-node"
            data-status={node.status}
            key={node.id}
            onClick={() => onSelect(node.id)}
            style={{ left: `${point[0]}%`, top: `${point[1]}%`, "--node-accent": node.accentColor ?? "var(--hub-accent)" } as CSSProperties}
            type="button"
          >
            <span className="hub-map-node__glyph"><HubIcon name={node.id === "matriz-hub" ? "cube" : "project"} size={20} /></span>
            <span><strong>{node.label}</strong><small>{node.version} · {node.statusLabel}</small></span>
          </button>
        )
      })}
    </div>
  )
}
