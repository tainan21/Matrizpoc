import { getCodexRunManager } from "../application/codex-run-manager"
import { buildOperationalHealth } from "../application/operational-health"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

async function main(): Promise<void> {
  const repository = await WorkspaceRepository.create()
  const health = await buildOperationalHealth(repository, getCodexRunManager())

  console.log(JSON.stringify(health, null, 2))

  const invalidIntegrations = health.notifications.projects.filter(
    (project) => project.status === "invalid",
  )
  if (health.projects.corrupted || invalidIntegrations.length) {
    console.error(
      `Health inválido: ${health.projects.corrupted} workspace(s) corrompido(s), ` +
        `${invalidIntegrations.length} integração(ões) inválida(s).`,
    )
    process.exitCode = 1
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha no health check.")
  process.exitCode = 1
})
