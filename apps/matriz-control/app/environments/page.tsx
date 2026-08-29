import { resolve } from "node:path"
import { listTerminalProjects } from "../../src/integration/projects/project-catalog"
import { EnvironmentRuntimeStatus } from "../../src/ui/operations/environment-update-status"
import { presentEnvironments } from "../../src/ui/operations/environment-presenter"

export const dynamic = "force-dynamic"

export default async function EnvironmentsPage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  const environments = presentEnvironments(await listTerminalProjects(root), "web")
  return <main className="page operational-page"><header className="page-title"><span className="section-label">CONTROL / APPS CONHECIDOS</span><h1>Ambientes</h1><p>Metadados declarados pelos projetos conhecidos; caminhos, variáveis e comandos não entram na interface.</p></header><section className="operation-table" aria-label="Ambientes locais">{environments.map((environment) => <article key={environment.id}><span><b>{environment.name}</b><small>{environment.version} · {environment.port}</small></span><EnvironmentRuntimeStatus appId={environment.id} actions={environment.actions} /></article>)}</section></main>
}
