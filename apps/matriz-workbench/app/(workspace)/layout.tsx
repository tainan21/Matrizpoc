import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { AppShell } from "../../src/ui/components/app-shell"
import { WorkspaceRepository } from "../../src/integration/filesystem/workspace-repository"
import { toProjectNavViewModel } from "../../src/ui/presenters/workspace-presenters"
import {
  normalizeRailPreference,
  normalizeTopbarPreference,
  RAIL_PREFERENCE_COOKIE,
  TOPBAR_PREFERENCE_COOKIE,
} from "../../src/ui/shell-preferences"

export const dynamic = "force-dynamic"

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const repository = await WorkspaceRepository.create()
  const projects = (await repository.discoverProjects()).map(toProjectNavViewModel)
  return (
    <AppShell
      initialRailPreference={normalizeRailPreference(cookieStore.get(RAIL_PREFERENCE_COOKIE)?.value)}
      initialTopbarPreference={normalizeTopbarPreference(cookieStore.get(TOPBAR_PREFERENCE_COOKIE)?.value)}
      projects={projects}
    >
      {children}
    </AppShell>
  )
}
