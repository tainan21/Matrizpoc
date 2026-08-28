import { randomUUID } from "node:crypto"
import { rm } from "node:fs/promises"
import pathApi from "node:path"
import type { DoctorSnapshot } from "../domain/doctor"
import type { TerminalProject, TerminalSession } from "../domain/terminal"
import { listTerminalProjects } from "../integration/projects/project-catalog"
import { inspectSystem } from "../integration/system/system-inspector"
import { getTerminalSupervisor } from "./terminal-supervisor"

type SessionState = Pick<TerminalSession, "projectId" | "status">
interface Options { rootDir: string; listProjects(): Promise<TerminalProject[]>; listSessions(): SessionState[]; inspect(rootDir: string, projects: TerminalProject[], sessions: TerminalSession[]): Promise<DoctorSnapshot>; remove(path: string): Promise<void>; now(): number }
interface Preview { token: string; projectId: string; targetId: "next" | "turbo"; bytes: number; path: string; expiresAt: number }
const folders = { next: ".next", turbo: ".turbo" } as const
function pathsFor(path: string) { return /^[a-z]:[\\/]/i.test(path) ? pathApi.win32 : pathApi }
function contained(parent: string, child: string) { const { isAbsolute, relative } = pathsFor(parent); const rel = relative(parent, child); return rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../") && !isAbsolute(rel) }
function resolvePath(parent: string, child: string) { return pathsFor(parent).resolve(parent, child) }

export class DoctorService {
  private snapshotCache: { expiresAt: number; value: DoctorSnapshot } | null = null
  private previews = new Map<string, Preview>()
  constructor(private readonly options: Options) {}
  async snapshot(refresh = false) { if (!refresh && this.snapshotCache && this.snapshotCache.expiresAt > this.options.now()) return structuredClone(this.snapshotCache.value); const projects = await this.options.listProjects(); const value = await this.options.inspect(this.options.rootDir, projects, this.options.listSessions() as TerminalSession[]); this.snapshotCache = { value, expiresAt: this.options.now() + 30_000 }; return structuredClone(value) }
  async previewCleanup(projectId: string, targetId: string) {
    if (!(targetId in folders)) throw new Error("Unsupported cleanup target")
    if (this.options.listSessions().some((session) => session.projectId === projectId && ["starting", "running", "stopping"].includes(session.status))) throw new Error("Project has an active session")
    const projects = await this.options.listProjects(); const project = projects.find((item) => item.id === projectId); if (!project) throw new Error("Unknown project")
    const path = resolvePath(project.path, folders[targetId as keyof typeof folders]); if (!contained(project.path, path)) throw new Error("Cleanup path outside project")
    const metric = (await this.snapshot(true)).projects.find((item) => item.id === projectId)?.cacheTargets.find((item) => item.id === targetId); if (!metric) throw new Error("Unknown cleanup target")
    const preview: Preview = { token: randomUUID(), projectId, targetId: targetId as Preview["targetId"], bytes: metric.bytes, path, expiresAt: this.options.now() + 60_000 }; this.previews.set(preview.token, preview)
    return { token: preview.token, projectId, targetId, bytes: preview.bytes, expiresAt: preview.expiresAt }
  }
  async confirmCleanup(token: string) {
    const preview = this.previews.get(token); this.previews.delete(token); if (!preview) throw new Error("Unknown cleanup preview"); if (preview.expiresAt <= this.options.now()) throw new Error("Cleanup preview expired")
    if (this.options.listSessions().some((session) => session.projectId === preview.projectId && ["starting", "running", "stopping"].includes(session.status))) throw new Error("Project has an active session")
    const project = (await this.options.listProjects()).find((item) => item.id === preview.projectId); if (!project) throw new Error("Unknown project")
    const expected = resolvePath(project.path, folders[preview.targetId]); if (expected !== preview.path || !contained(project.path, expected)) throw new Error("Cleanup target changed")
    await this.options.remove(expected); this.snapshotCache = null; return { reclaimedBytes: preview.bytes }
  }
}

const rootDir = pathApi.resolve(process.cwd(), "../..")
const globalKey = Symbol.for("matriz.control.doctor-service")
export function getDoctorService() { const scope = globalThis as typeof globalThis & { [globalKey]?: DoctorService }; return scope[globalKey] ??= new DoctorService({ rootDir, listProjects: () => listTerminalProjects(rootDir), listSessions: () => getTerminalSupervisor().list(), inspect: inspectSystem, remove: (path) => rm(path, { recursive: true, force: true }), now: Date.now }) }
