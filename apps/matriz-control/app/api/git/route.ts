import { resolve } from "node:path"
import { assertSameOrigin } from "../../../src/application/http"
import { GitCliRepository } from "../../../src/modules/git/integration/git-cli-repository"
import { presentGitOverview } from "../../../src/modules/git/presentation/git-presenter"

export const dynamic = "force-dynamic"

function repository() { return new GitCliRepository(process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")) }

async function snapshot() {
  const client = repository()
  return { overview: presentGitOverview(await client.overview()), branches: await client.branches(), history: await client.history(), reflog: await client.reflog() }
}

export async function GET() {
  try { return Response.json(await snapshot(), { headers: { "Cache-Control": "no-store" } }) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Git indisponível" }, { status: 503 }) }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const body = await request.json() as Record<string, unknown>
    const client = repository()
    if (body.action === "stage" || body.action === "unstage") {
      const paths = pathsOf(body.paths)
      await (body.action === "stage" ? client.stage(paths) : client.unstage(paths))
    } else if (body.action === "commit" && typeof body.message === "string") await client.commit(body.message)
    else if (body.action === "create-branch" && typeof body.name === "string") await client.createBranch(body.name, body.checkout === true)
    else if (body.action === "switch-branch" && typeof body.name === "string") await client.switchBranch(body.name)
    else if (body.action === "rename-branch" && typeof body.name === "string") await client.renameBranch(body.name)
    else if (body.action === "delete-branch" && typeof body.name === "string" && body.force === false) await client.deleteBranch(body.name)
    else if (body.action === "fetch") await client.fetch()
    else if (body.action === "pull") await client.pull()
    else if (body.action === "push") await client.push()
    else if (body.action === "merge" && typeof body.name === "string") await client.merge(body.name)
    else if (body.action === "abort-merge") await client.abortMerge()
    else throw new Error("Ação Git não suportada")
    return Response.json(await snapshot())
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha na ação Git" }, { status: 400 }) }
}

function pathsOf(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200 || value.some((item) => typeof item !== "string")) throw new Error("Seleção de arquivos inválida")
  return value as string[]
}
