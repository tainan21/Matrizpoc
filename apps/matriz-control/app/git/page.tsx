import { resolve } from "node:path"
import { GitCliRepository } from "../../src/modules/git/integration/git-cli-repository"
import { GitConsole } from "../../src/modules/git/presentation/git-console"
import { presentGitOverview } from "../../src/modules/git/presentation/git-presenter"

export const dynamic = "force-dynamic"

export default async function GitPage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  try {
    const client = new GitCliRepository(root)
    const [overview, branches, history, reflog] = await Promise.all([client.overview(), client.branches(), client.history(), client.reflog()])
    return <GitConsole initial={{ overview: presentGitOverview(overview), branches, history, reflog }} />
  } catch (error) {
    return <GitConsole initial={null} />
  }
}
