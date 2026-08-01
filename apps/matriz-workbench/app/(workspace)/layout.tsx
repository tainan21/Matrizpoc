import type { ReactNode } from "react"
import { AppShell } from "../../src/ui/components/app-shell"
import { WorkspaceRepository } from "../../src/integration/filesystem/workspace-repository"
import { toProjectNavViewModel } from "../../src/ui/presenters/workspace-presenters"

export const dynamic = "force-dynamic"

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const repository = await WorkspaceRepository.create()
  const projects = (await repository.discoverProjects()).map(toProjectNavViewModel)
  return <AppShell projects={projects}>{children}</AppShell>
}
