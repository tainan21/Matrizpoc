import type { CodexRunManager } from "./codex-run-manager"
import path from "node:path"
import { NotificationOutboxStore } from "../integration/collaboration/notification-outbox-store"
import type { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { collectStaticAssetMetrics, type StaticAssetMetrics } from "./build-metrics"

export interface ProjectNotificationHealth {
  projectId: string
  enabled: boolean
  channels: string[]
  queued: number
  failed: number
  delivered: number
  canceled: number
  status: "healthy" | "attention" | "disabled" | "invalid"
  detail?: string
}

export interface OperationalHealth {
  generatedAt: string
  projects: {
    detected: number
    initialized: number
    corrupted: number
    discoveryDurationMs: number
  }
  build: StaticAssetMetrics
  codex: {
    available: boolean
    source?: string
    activeRuns: number
    maxConcurrentRuns: number
    detail?: string
  }
  notifications: {
    configuredProjects: number
    queued: number
    failed: number
    delivered: number
    adaptersConnected: false
    projects: ProjectNotificationHealth[]
  }
}

export async function buildOperationalHealth(
  repository: WorkspaceRepository,
  codexManager: CodexRunManager,
): Promise<OperationalHealth> {
  const discoveryStartedAt = performance.now()
  const projects = await repository.discoverProjects()
  const discoveryDurationMs = Math.round((performance.now() - discoveryStartedAt) * 100) / 100
  const initialized = projects.filter((project) => project.initialized)
  const store = new NotificationOutboxStore(repository.repositoryRoot)
  const notificationProjects = await Promise.all(
    initialized.map(async (project): Promise<ProjectNotificationHealth> => {
      try {
        const [config, items] = await Promise.all([
          store.getConfig(project.id),
          store.list(project.id),
        ])
        const queued = items.filter((item) =>
          item.status === "queued" || item.status === "delivering").length
        const failed = items.filter((item) => item.status === "failed").length
        const delivered = items.filter((item) => item.status === "delivered").length
        const canceled = items.filter((item) => item.status === "canceled").length
        return {
          projectId: project.id,
          enabled: config.enabled,
          channels: config.channels,
          queued,
          failed,
          delivered,
          canceled,
          status: !config.enabled ? "disabled" : failed ? "attention" : "healthy",
        }
      } catch (error) {
        return {
          projectId: project.id,
          enabled: false,
          channels: [],
          queued: 0,
          failed: 0,
          delivered: 0,
          canceled: 0,
          status: "invalid",
          detail: error instanceof Error ? error.message : "Estado de integração inválido.",
        }
      }
    }),
  )
  const [runtime, build] = await Promise.all([
    codexManager.runtimeInfo(),
    collectStaticAssetMetrics(
      path.join(repository.repositoryRoot, "apps", "matriz-workbench"),
    ),
  ])
  return {
    generatedAt: new Date().toISOString(),
    projects: {
      detected: projects.length,
      initialized: initialized.length,
      corrupted: projects.filter((project) => project.corrupted).length,
      discoveryDurationMs,
    },
    build,
    codex: {
      available: runtime.available,
      source: runtime.source,
      activeRuns: runtime.activeRuns,
      maxConcurrentRuns: runtime.maxConcurrentRuns,
      detail: runtime.reason,
    },
    notifications: {
      configuredProjects: notificationProjects.filter((project) => project.enabled).length,
      queued: notificationProjects.reduce((total, project) => total + project.queued, 0),
      failed: notificationProjects.reduce((total, project) => total + project.failed, 0),
      delivered: notificationProjects.reduce((total, project) => total + project.delivered, 0),
      adaptersConnected: false,
      projects: notificationProjects,
    },
  }
}
