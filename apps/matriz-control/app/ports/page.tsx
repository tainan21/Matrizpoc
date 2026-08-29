import { resolve } from "node:path"
import { getTerminalSupervisor } from "../../src/application/terminal-supervisor"
import { listTerminalProjects } from "../../src/integration/projects/project-catalog"
import { observeLoopbackPort } from "../../src/integration/system/port-observer"
import { presentPorts } from "../../src/ui/operations/ports-presenter"

export const dynamic = "force-dynamic"

export default async function PortsPage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  const projects = await listTerminalProjects(root)
  const ports = [...new Set(projects.flatMap((project) => project.port ? [project.port] : []))]
  const availability = new Map(await Promise.all(ports.map(async (port) => [port, await observeLoopbackPort(port)] as const)))
  const view = presentPorts({ projects, sessions: getTerminalSupervisor().list().map(({ projectId, port, status }) => ({ projectId, port, status })), availability })
  return <main className="page operational-page"><header className="page-title"><span className="section-label">CONTROL / OBSERVAÇÃO</span><h1>Portas</h1><p>Somente leitura de portas declaradas. O Control não mata processos externos nem reserva portas nesta visão.</p></header><section className="operation-table" aria-label="Portas declaradas">{view.map((port) => <article key={port.projectId}><span><b>{port.projectName}</b><small>{port.port ? `127.0.0.1:${port.port}` : "sem porta"}</small></span><code data-port-state={port.state}>{port.label}</code></article>)}</section></main>
}
