import { auditWorkbenchMaturity } from "../application/maturity-evidence-audit"
import { buildProjectInventories } from "../application/project-inventory"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

async function main(): Promise<void> {
  const repository = await WorkspaceRepository.create()

  for (const projectId of ["seumei", "spot"]) {
    await repository.initializeProject(projectId)
  }

  const current = await repository.getRoadmap("matriz-workbench")
  const audit = await auditWorkbenchMaturity(repository.repositoryRoot, current.goals)
  const scored = await repository.updateRoadmapGoals(
    "matriz-workbench",
    audit.goals,
    current.revision,
    "system",
  )
  const phases = scored.phases.map((phase, index) => ({
    ...phase,
    status:
      index <= 2
        ? "completed" as const
        : index === 3
          ? "active" as const
          : phase.status,
  }))
  await repository.updateRoadmap("matriz-workbench", phases, scored.revision, "system")
  await repository.appendActivity("matriz-workbench", {
    actor: "system",
    action: "ecosystem.inventory_synchronized",
    summary: `Inventário sincronizado e score revalidado em ${audit.score}/100.`,
    entityType: "project",
    entityId: "matriz-workbench",
    metadata: { detectedProjects: (await repository.discoverProjects()).length, score: audit.score },
  })

  const inventory = await buildProjectInventories(repository)
  process.stdout.write(`${JSON.stringify({
    score: audit.score,
    projects: inventory.map((item) => ({
      id: item.project.id,
      initialized: item.project.initialized,
      stack: item.local.technologies,
      branch: item.git.branch,
      vercel: item.vercel.configured,
    })),
  }, null, 2)}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha ao sincronizar."}\n`)
  process.exitCode = 1
})
