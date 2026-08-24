import { runHealthCheck, type HealthCheckKind, type HealthCheckRunResult } from "./domain"
import type { HealthCheckResultRepository } from "./result-repository"
import {
  createRouteTargets,
  discoverApiTargets,
  type HealthEnvironmentProfile,
  type RegisteredHealthApp,
} from "./sources"

export interface HealthCheckApplicationDependencies {
  readonly workspaceRoot: string
  readonly apps: readonly RegisteredHealthApp[]
  readonly profiles: readonly HealthEnvironmentProfile[]
  repository: HealthCheckResultRepository
  readonly fetcher?: typeof fetch
}

export async function executeHealthCheck(
  kind: HealthCheckKind,
  environment: string,
  dependencies: HealthCheckApplicationDependencies,
): Promise<HealthCheckRunResult> {
  const profile = dependencies.profiles.find((candidate) => candidate.name === environment)
  if (!profile) throw new Error(`Ambiente não configurado: ${environment}.`)

  const targets = kind === "routes"
    ? createRouteTargets(dependencies.apps, profile)
    : await discoverApiTargets(dependencies.workspaceRoot, dependencies.apps, profile)
  const result = await runHealthCheck({
    kind,
    environment,
    targets,
    fetcher: dependencies.fetcher,
  })

  try {
    await dependencies.repository.save(result)
    return result
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro desconhecido"
    return {
      ...result,
      persistenceWarning: `A execução terminou, mas o último resultado não foi salvo: ${detail}`,
    }
  }
}
