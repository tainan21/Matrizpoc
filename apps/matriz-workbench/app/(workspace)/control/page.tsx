import { ControlPage } from "../../../src/ui/components/control-console"
import { buildControlSnapshot } from "../../../src/application/control-service"
import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"

export const dynamic = "force-dynamic"

export default async function ControlRoute({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  const params = await searchParams
  const repository = await WorkspaceRepository.create()
  const snapshot = await buildControlSnapshot(repository, params?.project)
  return <ControlPage snapshot={snapshot} />
}
