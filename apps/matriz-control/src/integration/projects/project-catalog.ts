import { readdir, readFile, realpath } from "node:fs/promises"
import { isAbsolute, join, relative, sep } from "node:path"
import { TERMINAL_ACTION_IDS, type ResolvedTerminalAction, type TerminalActionId, type TerminalProject } from "../../domain/terminal"

const labels: Record<TerminalActionId, string> = { dev: "Iniciar", lint: "Lint", typecheck: "Typecheck", test: "Testes" }
const idPattern = /^[a-z0-9][a-z0-9-]*$/

interface PackageJson { name?: string; scripts?: Record<string, string> }

async function readPackage(path: string): Promise<PackageJson> {
  return JSON.parse(await readFile(path, "utf8")) as PackageJson
}

async function appsRoot(rootDir: string) {
  return realpath(join(rootDir, "apps"))
}

function contained(parent: string, child: string) {
  const rel = relative(parent, child)
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
}

export function terminalRoute(rootDir: string, path: string) {
  const rel = relative(rootDir, path)
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Path outside workspace")
  const suffix = rel.split(/[\\/]+/).filter(Boolean).join("/").toLowerCase()
  return suffix ? `mih/${suffix}` : "mih"
}

export async function listTerminalProjects(rootDir: string): Promise<TerminalProject[]> {
  const root = await appsRoot(rootDir)
  const entries = await readdir(root, { withFileTypes: true })
  const projects: TerminalProject[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !idPattern.test(entry.name) || entry.name === "incoming") continue
    try {
      const path = await realpath(join(root, entry.name))
      if (!contained(root, path)) continue
      const pkg = await readPackage(join(path, "package.json"))
      const actions = TERMINAL_ACTION_IDS.filter((id) => Boolean(pkg.scripts?.[id])).map((id) => ({ id, label: labels[id] }))
      const portMatch = pkg.scripts?.dev?.match(/(?:-p|--port)(?:=|\s+)(\d{2,5})/)
      const port = portMatch ? Number(portMatch[1]) : null
      if (actions.length) projects.push({ id: entry.name, name: pkg.name?.replace(/^@matriz\/app-/, "") ?? entry.name, path, port, actions })
    } catch { /* Invalid project entries are not executable. */ }
  }
  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

export async function resolveTerminalAction(rootDir: string, projectId: string, actionId: string): Promise<ResolvedTerminalAction> {
  if (!idPattern.test(projectId)) throw new Error("Invalid project")
  if (!TERMINAL_ACTION_IDS.includes(actionId as TerminalActionId)) throw new Error("Unsupported action")
  const project = (await listTerminalProjects(rootDir)).find((item) => item.id === projectId)
  if (!project) throw new Error("Unknown project")
  const action = project.actions.find((item) => item.id === actionId)
  if (!action) throw new Error("Unsupported action")
  return { projectId, projectName: project.name, actionId: action.id, label: action.label, command: "corepack", args: ["pnpm", "run", action.id], cwd: project.path, port: project.port }
}
