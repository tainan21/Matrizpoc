import { resolve } from "node:path"
import { GitCliRepository } from "../../src/modules/git/integration/git-cli-repository"
import { GitConsole } from "../../src/modules/git/presentation/git-console"
import { presentGitOverview } from "../../src/modules/git/presentation/git-presenter"

export const dynamic = "force-dynamic"

export default async function GitPage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  try {
    const client = new GitCliRepository(root)
    return <GitConsole initial={{ overview: presentGitOverview(await client.overview()), branches: await client.branches() }} />
  } catch (error) {
    return <GitConsole initial={null} />
  }
}
