import { execFile } from "node:child_process"
import { readdir, stat, statfs } from "node:fs/promises"
import { join } from "node:path"
import { promisify } from "node:util"
import type { DoctorSnapshot, ProcessMetric, ResourceStatus } from "../../domain/doctor"
import type { TerminalProject, TerminalSession } from "../../domain/terminal"
import { terminalRoute } from "../projects/project-catalog"

const execFileAsync = promisify(execFile)
const GB = 1_000_000_000

export function classifyDrive(value: { totalBytes: number | null; freeBytes: number | null }): ResourceStatus {
  if (!value.totalBytes || value.freeBytes === null) return "unknown"
  const free = value.freeBytes / value.totalBytes
  return free < .08 ? "critical" : free < .15 ? "warning" : "healthy"
}
export function classifyProjectCache(bytes: number | null): ResourceStatus { return bytes === null ? "unknown" : bytes >= 3 * GB ? "critical" : bytes >= GB ? "warning" : "healthy" }
export function classifyRam(bytes: number | null): ResourceStatus { return bytes === null ? "unknown" : bytes >= 3 * GB ? "critical" : bytes >= 1.5 * GB ? "warning" : "healthy" }
export function sumProcessTree(rootPid: number | null, rows: ProcessMetric[]) {
  if (!rootPid) return null
  const descendants = new Set([rootPid])
  let changed = true
  while (changed) { changed = false; for (const row of rows) if (descendants.has(row.parentPid) && !descendants.has(row.pid)) { descendants.add(row.pid); changed = true } }
  const matches = rows.filter((row) => descendants.has(row.pid))
  return matches.length ? matches.reduce((sum, row) => sum + row.memoryBytes, 0) : null
}

async function directoryBytes(path: string): Promise<number> {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    let total = 0
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const child = join(path, entry.name)
      total += entry.isDirectory() ? await directoryBytes(child) : entry.isFile() ? (await stat(child)).size : 0
    }
    return total
  } catch { return 0 }
}

async function processes(): Promise<ProcessMetric[]> {
  if (process.platform !== "win32") return [{ pid: process.pid, parentPid: process.ppid, memoryBytes: process.memoryUsage().rss }]
  try {
    const script = "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize | ConvertTo-Json -Compress"
    const { stdout } = await execFileAsync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 5000 })
    const raw = JSON.parse(stdout || "[]") as Record<string, number> | Record<string, number>[]
    return (Array.isArray(raw) ? raw : [raw]).map((row) => ({ pid: row.ProcessId ?? 0, parentPid: row.ParentProcessId ?? 0, memoryBytes: row.WorkingSetSize ?? 0 }))
  } catch { return [] }
}

let processCache: { expiresAt: number; rows: ProcessMetric[] } | null = null
let processRefresh: Promise<ProcessMetric[]> | null = null
export async function inspectManagedMemory(sessions: TerminalSession[]) {
  const now = Date.now()
  if (!processCache || processCache.expiresAt <= now) {
    processRefresh ??= processes().finally(() => { processRefresh = null })
    processCache = { rows: await processRefresh, expiresAt: Date.now() + 5_000 }
  }
  return new Map(sessions.map((session) => [session.id, sumProcessTree(session.pid, processCache?.rows ?? [])]))
}

async function inspectGit(rootDir: string) {
  try {
    const [{ stdout: branch }, { stdout: changes }] = await Promise.all([
      execFileAsync("git", ["-C", rootDir, "branch", "--show-current"], { windowsHide: true, timeout: 3000 }),
      execFileAsync("git", ["-C", rootDir, "status", "--porcelain", "--untracked-files=normal"], { windowsHide: true, timeout: 3000 }),
    ])
    return { branch: branch.trim() || null, changedPaths: changes.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).replaceAll("\\", "/")) }
  } catch { return { branch: null, changedPaths: null } }
}

export async function inspectSystem(rootDir: string, projects: TerminalProject[], sessions: TerminalSession[]): Promise<DoctorSnapshot> {
  let totalBytes: number | null = null; let freeBytes: number | null = null
  try { const drive = await statfs(rootDir); totalBytes = drive.blocks * drive.bsize; freeBytes = drive.bavail * drive.bsize } catch { /* unknown */ }
  const processRows = await processes()
  const git = await inspectGit(rootDir)
  const projectMetrics = await Promise.all(projects.map(async (project) => {
    const targets = await Promise.all(([{ id: "next", folder: ".next" }, { id: "turbo", folder: ".turbo" }] as const).map(async (target) => ({ id: target.id, bytes: await directoryBytes(join(project.path, target.folder)), reclaimable: true })))
    const cacheBytes = targets.reduce((sum, target) => sum + target.bytes, 0)
    const active = sessions.find((session) => session.projectId === project.id && ["starting", "running", "stopping"].includes(session.status))
    const memoryBytes = sumProcessTree(active?.pid ?? null, processRows)
    const states = [classifyProjectCache(cacheBytes), classifyRam(memoryBytes)]
    const status: ResourceStatus = states.includes("critical") ? "critical" : states.includes("warning") ? "warning" : states.every((item) => item === "unknown") ? "unknown" : "healthy"
    const measuredTotal = await directoryBytes(project.path)
    const projectPrefix = terminalRoute(rootDir, project.path).replace(/^mih\//, "") + "/"
    const dirty = git.changedPaths === null ? null : git.changedPaths.some((path) => path === projectPrefix.slice(0, -1) || path.startsWith(projectPrefix))
    return { id: project.id, name: project.name.toLowerCase(), route: terminalRoute(rootDir, project.path), totalBytes: Math.max(measuredTotal, cacheBytes), cacheBytes, memoryBytes, branch: git.branch, dirty, status, cacheTargets: targets }
  }))
  return { generatedAt: new Date().toISOString(), drive: { totalBytes, freeBytes, status: classifyDrive({ totalBytes, freeBytes }) }, projects: projectMetrics }
}
