import { getGlobalEventBus } from "@matriz/integration-events"
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { collectAllTelemetry } from "@matriz/platform-telemetry"
import { bootstrapMatrizHub, ensureInstitutionalBootstrapped } from "../../bootstrap"
import { readEvolutionSource } from "../evolution/evolution-source"
import { toHubOverviewVM } from "./overview-presenter"
import type { HubOverviewVM } from "./types"

export async function loadHubOverview(): Promise<HubOverviewVM> {
  bootstrapMatrizHub()
  await ensureInstitutionalBootstrapped()

  const registry = getGlobalRegistry()
  const institutionalRegistry = getGlobalInstitutionalRegistry()
  const apps = registry.listEnabled()
  const projects = institutionalRegistry.list()
  const events = getGlobalEventBus().history()
  const telemetry = collectAllTelemetry()
  const evolution = readEvolutionSource()

  return toHubOverviewVM({
    generatedAt: new Date().toISOString(),
    apps: apps.map((entry) => ({
      appId: entry.appId,
      name: entry.manifest.name,
      description: entry.manifest.description,
      version: entry.manifest.version,
      enabled: entry.enabled,
      capabilitiesCount: entry.manifest.capabilities.length,
      routesCount: entry.manifest.routes.length,
      integrationsCount: entry.manifest.integrations.length,
      integrations: entry.manifest.integrations.map((integration) => ({
        targetAppId: integration.targetAppId,
        kind: integration.kind,
      })),
    })),
    projects: projects.map((project) => ({
      projectId: project.projectId,
      displayName: project.displayName,
      healthStatus: project.health.status,
      readinessScore: project.health.readinessScore,
      lastCheckAt: project.health.lastCheckAt,
      accentColor: project.brand.accentColor,
    })),
    events: events.map((event) => ({
      id: event.id,
      type: event.name,
      source: event.sourceApp,
      occurredAt: event.occurredAt,
    })),
    telemetry: telemetry.map((event) => ({
      id: event.id,
      type: event.type,
      source: event.appId,
      occurredAt: event.occurredAt,
    })),
    institutionalUpdatedAt: institutionalRegistry.lastReplacedAt(),
    changes: evolution.activity.map((item) => ({
      id: item.id,
      label: item.summary,
      actor: item.actor,
      occurredAt: item.occurredAt,
    })),
  })
}
