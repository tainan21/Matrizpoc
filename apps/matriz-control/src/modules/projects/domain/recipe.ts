import { createHash } from "node:crypto"
import type { ProjectPermission } from "./permissions"

export type DetectionEvidence = Readonly<{ detector: string; kind: string; value: string }>
export type PortRequest = Readonly<{ port: number; environmentKey: string | null }>
export type ReadinessProbe = Readonly<{ kind: "http" | "tcp" | "output" | "alive"; path: string | null; timeoutMs: number }>

export type ProjectAction = Readonly<{
  id: string
  label: string
  executable: string
  args: readonly string[]
  cwdRef: string
  allowedEnvironmentKeys: readonly string[]
  requestedPorts: readonly PortRequest[]
  readiness: ReadinessProbe | null
  lifecycle: "foreground" | "service" | "one-shot"
}>

export type ProjectSurface = Readonly<{
  id: string
  label: string
  kind: "embedded-web" | "external-browser" | "terminal" | "service-only"
  originPolicy: "exact-loopback"
  healthPath: string | null
}>

export type ProjectRecipeMaterial = {
  detectors: DetectionEvidence[]
  prepareActions: ProjectAction[]
  runActions: ProjectAction[]
  surfaces: ProjectSurface[]
  permissions: ProjectPermission[]
}

export type ProjectRecipe = Readonly<ProjectRecipeMaterial & { revision: string }>

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
  }
  return value
}

export function computeRecipeRevision(material: ProjectRecipeMaterial): string {
  return createHash("sha256").update(JSON.stringify(stable(material))).digest("hex")
}
