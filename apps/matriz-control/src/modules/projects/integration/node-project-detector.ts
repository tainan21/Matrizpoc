import type { ProjectAction, ProjectSurface, DetectionEvidence } from "../domain/recipe"
import type { ProjectFileEvidence } from "../ports"

export type NodeProjectCandidate = Readonly<{
  status: "candidate" | "needs_review" | "blocked"
  detectors: readonly DetectionEvidence[]
  prepareActions: readonly ProjectAction[]
  runActions: readonly ProjectAction[]
  surfaces: readonly ProjectSurface[]
  warnings: readonly string[]
  conflicts: readonly string[]
}>

type PackageManifest = { name?: string; engines?: { node?: string }; scripts?: Record<string, string>; workspaces?: unknown }
type Manager = "pnpm" | "npm" | "bun"

function managerFor(path: string): Manager | null {
  if (path === "pnpm-lock.yaml") return "pnpm"
  if (path === "package-lock.json" || path === "npm-shrinkwrap.json") return "npm"
  if (path === "bun.lock" || path === "bun.lockb") return "bun"
  return null
}

function prepareAction(manager: Manager): ProjectAction {
  if (manager === "pnpm") return { id: "prepare.pnpm", label: "Install dependencies", executable: "corepack", args: ["pnpm", "install", "--frozen-lockfile"], cwdRef: "root", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }
  if (manager === "npm") return { id: "prepare.npm", label: "Install dependencies", executable: "npm", args: ["ci"], cwdRef: "root", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }
  return { id: "prepare.bun", label: "Install dependencies", executable: "bun", args: ["install", "--frozen-lockfile"], cwdRef: "root", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }
}

function runAction(manager: Manager | null, id: string, script: string): ProjectAction {
  const portMatch = script.match(/(?:-p|--port)(?:=|\s+)(\d{2,5})/) ?? script.match(/\bPORT=(\d{2,5})\b/i)
  const port = portMatch ? Number(portMatch[1]) : null
  const executable = manager === "pnpm" ? "corepack" : manager ?? "npm"
  const args = manager === "pnpm" ? ["pnpm", "run", id] : ["run", id]
  return {
    id: `run.${id}`,
    label: id === "dev" ? "Start development server" : `Run ${id}`,
    executable,
    args,
    cwdRef: "root",
    allowedEnvironmentKeys: port ? ["PORT"] : [],
    requestedPorts: port ? [{ port, environmentKey: "PORT" }] : [],
    readiness: port ? { kind: "http", path: "/", timeoutMs: 30_000 } : null,
    lifecycle: "service",
  }
}

export function detectNodeProject(files: readonly ProjectFileEvidence[]): NodeProjectCandidate {
  const manifestFile = files.find((item) => item.relativePath === "package.json")
  if (!manifestFile) return { status: "needs_review", detectors: [], prepareActions: [], runActions: [], surfaces: [], warnings: [], conflicts: [] }
  let manifest: PackageManifest
  try { manifest = JSON.parse(manifestFile.content) as PackageManifest } catch { throw new Error("Invalid package.json") }
  if (!manifest || typeof manifest !== "object" || (manifest.scripts !== undefined && (typeof manifest.scripts !== "object" || Array.isArray(manifest.scripts)))) throw new Error("Invalid package.json")
  const managers = [...new Set(files.map((item) => managerFor(item.relativePath)).filter((item): item is Manager => item !== null))].sort()
  const detectors: DetectionEvidence[] = [{ detector: "node", kind: "manifest", value: "package.json" }]
  if (manifest.engines?.node) detectors.push({ detector: "node", kind: "engine", value: manifest.engines.node })
  if (manifest.workspaces || files.some((item) => item.relativePath === "pnpm-workspace.yaml")) detectors.push({ detector: "node", kind: "workspace", value: "workspace metadata" })
  for (const manager of managers) detectors.push({ detector: "node", kind: "package-manager", value: manager })
  if (managers.length > 1) return { status: "blocked", detectors, prepareActions: [], runActions: [], surfaces: [], warnings: [], conflicts: [`Multiple package managers detected: ${managers.join(", ")}`] }
  const manager = managers[0] ?? null
  const runnable = ["dev", "start", "serve"].filter((id) => typeof manifest.scripts?.[id] === "string")
  const runActions = runnable.map((id) => runAction(manager, id, manifest.scripts![id]))
  const port = runActions.flatMap((action) => action.requestedPorts)[0]?.port
  return {
    status: runActions.length ? "candidate" : "needs_review",
    detectors,
    prepareActions: manager ? [prepareAction(manager)] : [],
    runActions,
    surfaces: port ? [{ id: "web", label: "Web interface", kind: "embedded-web", originPolicy: "exact-loopback", healthPath: "/" }] : [],
    warnings: manager ? ["Package-manager lifecycle scripts may execute during preparation."] : [],
    conflicts: [],
  }
}
