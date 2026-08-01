import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId).catch(() => null)
  if (!project) notFound()
  return children
}
