import { resolve } from "node:path"
import { getDoctorService } from "../../src/application/doctor-service"
import { getTerminalSupervisor } from "../../src/application/terminal-supervisor"
import { withReadDeadline } from "../../src/application/read-deadline"
import { listTerminalProjects } from "../../src/integration/projects/project-catalog"
import { GitCliRepository } from "../../src/modules/git/integration/git-cli-repository"
import { presentGitOverview } from "../../src/modules/git/presentation/git-presenter"
import { PulseUpdateStatus } from "../../src/ui/operations/pulse-update-status"
import { presentPulse } from "../../src/ui/operations/pulse-presenter"

export const dynamic = "force-dynamic"

export default async function PulsePage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  const [projectsResult, gitResult, doctorResult] = await Promise.allSettled([listTerminalProjects(root), withReadDeadline(new GitCliRepository(root).overview().then(presentGitOverview), 2_000), withReadDeadline(getDoctorService().snapshot(), 2_000)])
  const sessions = getTerminalSupervisor().list().map(({ projectId, status }) => ({ projectId, status }))
  const doctor = doctorResult.status === "fulfilled" ? doctorResult.value : null
  const view = presentPulse({
    projects: projectsResult.status === "fulfilled" ? projectsResult.value.map(({ id, name }) => ({ id, name })) : [],
    sessions,
    git: gitResult.status === "fulfilled" ? { available: true, dirty: gitResult.value.changeTotal > 0 } : { available: false, dirty: false },
    doctor: doctor ? { available: true, status: doctor.projects.some((item) => item.status === "critical") ? "critical" : doctor.projects.some((item) => item.status === "warning") ? "warning" : "healthy" } : { available: false, status: "unknown" },
  })
  return <main className="page operational-page"><header className="page-title"><span className="section-label">CONTROL / DISPONIBILIDADE</span><h1>Pulso</h1><p>Leitura local do que o Control conhece. Nada é iniciado, parado ou elevado nesta tela.</p></header><section className="operation-grid"><article className="operation-card"><span>SESSÕES LOCAIS</span><strong>{view.sessions.running} ativas</strong><p>{view.sessions.attention ? `${view.sessions.attention} exigem atenção` : "Nenhuma sessão em atenção"} · {view.sessions.total} conhecidas</p></article><article className="operation-card"><span>PROJETOS CONHECIDOS</span><strong>{view.projects.known}</strong><p>{view.projects.active} com sessão gerenciada</p></article><article className="operation-card"><span>GIT</span><strong data-tone={view.git.tone}>{view.git.label}</strong><p>Resumo do workspace atualmente selecionado.</p></article><article className="operation-card"><span>DOCTOR</span><strong data-tone={view.doctor.tone}>{view.doctor.label}</strong><p>Leitura de recursos e sinais locais conhecidos.</p></article><PulseUpdateStatus /></section></main>
}
