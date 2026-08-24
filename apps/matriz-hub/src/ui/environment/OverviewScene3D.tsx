"use client"

import { Html, Line, MapControls, PerspectiveCamera } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import type { CSSProperties } from "react"
import { layoutOverviewNodes } from "./overview-layout"
import type { HubGraphEdgeVM, HubGraphNodeVM } from "./types"

export default function OverviewScene3D({ nodes, edges, selectedId, onSelect }: {
  readonly nodes: readonly HubGraphNodeVM[]
  readonly edges: readonly HubGraphEdgeVM[]
  readonly selectedId?: string
  readonly onSelect: (id: string) => void
}) {
  const positions = layoutOverviewNodes(nodes)
  return (
    <Canvas className="hub-map-3d" dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
      <PerspectiveCamera makeDefault position={[0, 10, 11]} fov={44} />
      <ambientLight intensity={1.4} />
      <pointLight color="#23a8ff" intensity={22} position={[0, 7, 2]} />
      <gridHelper args={[18, 24, "#163a50", "#0b2433"]} position={[0, -0.7, 0]} />
      {edges.map((edge) => {
        const source = positions.get(edge.sourceId)
        const target = positions.get(edge.targetId)
        if (!source || !target) return null
        return <Line color="#248ed0" key={edge.id} lineWidth={selectedId === edge.sourceId || selectedId === edge.targetId ? 1.8 : 0.7} opacity={0.6} points={[[source.x, source.y, source.z], [target.x, target.y, target.z]]} transparent />
      })}
      {nodes.map((node) => {
        const position = positions.get(node.id) ?? { x: 0, y: 0, z: 0 }
        const selected = selectedId === node.id
        const color = node.accentColor ?? (node.status === "complete" ? "#2bd67b" : node.status === "attention" ? "#f0a125" : "#23a8ff")
        return (
          <group key={node.id} position={[position.x, position.y + (selected ? .45 : 0), position.z]}>
            <mesh onClick={(event) => { event.stopPropagation(); onSelect(node.id) }} scale={selected ? 1.2 : 1}>
              <boxGeometry args={node.id === "matriz-hub" ? [1.25, 1.25, 1.25] : [.85, .85, .85]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? .75 : .22} metalness={.45} roughness={.34} />
            </mesh>
            <Html center distanceFactor={10} position={[0, -1.05, 0]} transform>
              <button aria-pressed={selected} className="hub-map-3d-label" onClick={() => onSelect(node.id)} style={{ "--node-accent": color } as CSSProperties} type="button">
                <strong>{node.label}</strong><small>{node.version} · {node.statusLabel}</small>
              </button>
            </Html>
          </group>
        )
      })}
      <MapControls enableDamping={false} maxDistance={18} maxPolarAngle={Math.PI / 2.12} minDistance={6} screenSpacePanning />
    </Canvas>
  )
}
