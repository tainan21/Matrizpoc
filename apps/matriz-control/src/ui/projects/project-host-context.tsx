"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { ProjectPreparationPreview } from "../../modules/projects/application/project-preparation-service"
import type { ProjectViewModel } from "../../modules/projects/presentation/project-presenter"

type ProjectHostContextValue = {
  projects: readonly ProjectViewModel[]
  loading: boolean
  busy: string | null
  error: string | null
  preview: ProjectPreparationPreview | null
  add(): Promise<void>
  inspect(projectId: string): Promise<void>
  approve(projectId: string, recipeRevision: string): Promise<void>
  previewPreparation(projectId: string, recipeRevision: string): Promise<void>
  prepare(projectId: string, recipeRevision: string): Promise<void>
  start(projectId: string, actionId: string, recipeRevision: string): Promise<void>
  stop(projectId: string, sessionId: string): Promise<void>
  restart(projectId: string, sessionId: string): Promise<void>
  open(projectId: string, surfaceId: string): Promise<void>
  remove(projectId: string): Promise<void>
  clearPreview(): void
}

const ProjectHostContext = createContext<ProjectHostContextValue | null>(null)

export function ProjectHostProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<readonly ProjectViewModel[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ProjectPreparationPreview | null>(null)
  const invoke = useCallback(async (command: Parameters<NonNullable<typeof window.matrizDesktop>["invoke"]>[0]) => {
    if (!window.matrizDesktop) throw new Error("O Project Host está disponível somente no aplicativo desktop.")
    setError(null)
    try { return await window.matrizDesktop.invoke(command) }
    catch (cause) { const message = cause instanceof Error ? cause.message : "A operação não pôde ser concluída."; setError(message); throw cause }
  }, [])
  const refresh = useCallback(async () => { const result = await invoke({ type: "project.host.list" }); setProjects(result as readonly ProjectViewModel[]) }, [invoke])
  const run = useCallback(async (key: string, operation: () => Promise<unknown>) => { setBusy(key); try { await operation(); await refresh() } finally { setBusy(null) } }, [refresh])

  useEffect(() => {
    if (!window.matrizDesktop) { setLoading(false); return }
    void refresh().catch(() => undefined).finally(() => setLoading(false))
    return window.matrizDesktop.subscribe((event) => { if (event.type === "project.updated") setProjects(event.projects) })
  }, [refresh])

  const value = useMemo<ProjectHostContextValue>(() => ({ projects, loading, busy, error, preview,
    add: () => run("add", () => invoke({ type: "project.pick-root" })),
    inspect: (projectId) => run(projectId, () => invoke({ type: "project.inspect", projectId })),
    approve: (projectId, recipeRevision) => run(projectId, () => invoke({ type: "project.approve", projectId, recipeRevision })),
    previewPreparation: async (projectId, recipeRevision) => { setBusy(projectId); try { setPreview(await invoke({ type: "project.prepare.preview", projectId, recipeRevision }) as ProjectPreparationPreview) } finally { setBusy(null) } },
    prepare: async (projectId, recipeRevision) => { if (!preview) throw new Error("A confirmação de preparo expirou."); await run(projectId, () => invoke({ type: "project.prepare", projectId, recipeRevision, confirmationToken: preview.confirmationToken })); setPreview(null) },
    start: (projectId, actionId, recipeRevision) => run(projectId, () => invoke({ type: "project.start", projectId, actionId, recipeRevision })),
    stop: (projectId, sessionId) => run(projectId, () => invoke({ type: "project.stop", projectId, sessionId })),
    restart: (projectId, sessionId) => run(projectId, () => invoke({ type: "project.restart", projectId, sessionId })),
    open: (projectId, surfaceId) => run(projectId, () => invoke({ type: "project.open", projectId, surfaceId })),
    remove: (projectId) => run(projectId, () => invoke({ type: "project.remove", projectId })), clearPreview: () => setPreview(null),
  }), [projects, loading, busy, error, preview, invoke, run])
  return <ProjectHostContext.Provider value={value}>{children}</ProjectHostContext.Provider>
}

export function useProjectHost() { const value = useContext(ProjectHostContext); if (!value) throw new Error("ProjectHostProvider ausente"); return value }
