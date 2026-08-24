import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { bootstrapMatrizHub } from "../../bootstrap"
import { executeHealthCheck, type HealthCheckApplicationDependencies } from "./application"
import type { HealthCheckKind, HealthCheckRunResult } from "./domain"
import { createFileHealthCheckResultRepository } from "./result-repository"
import {
  findHealthCheckWorkspaceRoot,
  loadHealthEnvironmentProfiles,
  type HealthEnvironmentProfile,
  type RegisteredHealthApp,
} from "./sources"

export interface HealthCheckRuntime extends HealthCheckApplicationDependencies {
  readonly apps: readonly RegisteredHealthApp[]
  readonly profiles: readonly HealthEnvironmentProfile[]
}

export async function createHealthCheckRuntime(): Promise<HealthCheckRuntime> {
  bootstrapMatrizHub()
  const apps = getGlobalRegistry().listEnabled().map<RegisteredHealthApp>((entry) => ({
    appId: entry.appId,
    name: entry.manifest.name,
    baseUrl: entry.baseUrl,
    routes: entry.manifest.routes.map((route) => route.path),
  }))
  const workspaceRoot = await findHealthCheckWorkspaceRoot()
  const profiles = loadHealthEnvironmentProfiles(
    apps,
    monorepoConfig.environment,
    process.env.MYHUB_HEALTH_PROFILES_JSON,
  )
  return {
    apps,
    workspaceRoot,
    profiles,
    repository: createFileHealthCheckResultRepository(workspaceRoot),
  }
}

export async function runConfiguredHealthCheck(
  kind: HealthCheckKind,
  environment: string,
): Promise<HealthCheckRunResult> {
  const runtime = await createHealthCheckRuntime()
  return executeHealthCheck(kind, environment, runtime)
}

export async function loadLatestHealthCheckResults(
  runtime: HealthCheckRuntime,
): Promise<Readonly<Record<string, {
  readonly routes: HealthCheckRunResult | null
  readonly apis: HealthCheckRunResult | null
}>>> {
  const entries = await Promise.all(runtime.profiles.map(async (profile) => {
    const [routes, apis] = await Promise.all([
      runtime.repository.getLatest("routes", profile.name),
      runtime.repository.getLatest("apis", profile.name),
    ])
    return [profile.name, { routes, apis }] as const
  }))
  return Object.fromEntries(entries)
}
