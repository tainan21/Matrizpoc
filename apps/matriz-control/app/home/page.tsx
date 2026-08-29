import Link from "next/link"
import { resolve } from "node:path"
import { listTerminalProjects } from "../../src/integration/projects/project-catalog"
import { GitCliRepository } from "../../src/modules/git/integration/git-cli-repository"
import { presentGitOverview } from "../../src/modules/git/presentation/git-presenter"
import { presentHome, type HomeInput } from "../../src/modules/home/presentation/home-presenter"
import styles from "./home.module.css"
import { ProjectHomeSummary } from "../../src/ui/projects/project-home-summary"
import { getDoctorService } from "../../src/application/doctor-service"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  const [git, projects, doctor] = await Promise.allSettled([new GitCliRepository(root).overview().then(presentGitOverview), listTerminalProjects(root).then((items) => items.map(({ id, name, port }) => ({ id, name, port }))), getDoctorService().snapshot()])
  const input: HomeInput = {
    git: git.status === "fulfilled" ? { status: "fulfilled", value: git.value } : { status: "rejected", reason: String(git.reason) },
    projects: projects.status === "fulfilled" ? { status: "fulfilled", value: projects.value } : { status: "rejected", reason: String(projects.reason) },
    doctor: doctor.status === "fulfilled" ? { status: "fulfilled", value: doctor.value } : { status: "rejected", reason: "Doctor indisponível nesta sessão." },
  }
  const view = presentHome(input)
  return <main className={styles.page}>
    <header className={styles.hero}><div><span>COMMAND CENTER</span><h1>INÍCIO</h1><p>O que está acontecendo agora no ambiente Matriz.</p></div><nav><Link href="/workspace">Novo workspace</Link><Link href="/apps">Abrir app</Link><Link href="/git">Ver Git</Link><Link href="/store">Instalar extensão</Link></nav></header>
    <section className={styles.context}>
      <article className={styles.git}><header><span>GIT · MATRIZ CONTROL</span><Link href="/git">Abrir Git →</Link></header>{view.git ? <><div className={styles.gitState}><strong>{view.git.branch}</strong><b data-attention={view.git.attention}>{view.git.status}</b><span>↑ {view.git.ahead} · ↓ {view.git.behind}</span></div><p>{view.git.changeTotal} alterações · {view.git.head} · {view.git.subject}</p></> : <p>Git indisponível nesta sessão.</p>}</article>
      <article className={styles.attention}><span>ATENÇÃO</span><strong>{view.git?.attention === "critical" ? "Conflitos precisam de resolução" : view.git?.attention === "high" ? "Branches divergentes" : view.git?.changeTotal ? "Mudanças aguardando decisão" : "Ambiente sob controle"}</strong><p>{view.unavailable.length ? `${view.unavailable.length} fonte indisponível · dados restantes continuam ativos.` : "Git, projetos e Doctor atualizados."}</p></article>
    </section>
    <ProjectHomeSummary />
    <section className={styles.operations}><div><header><span>APPS E PROJETOS</span><Link href="/apps">Gerenciar →</Link></header>{view.projects.slice(0,6).map((project) => <Link href="/apps" key={project.id}><b>{project.name}</b><span>{project.port ? `:${project.port}` : "sem porta"}</span></Link>)}</div><div><header><span>PRÓXIMAS AÇÕES</span></header><Link href="/git">Revisar mudanças do Git <b>→</b></Link><Link href="/doctor">Executar Doctor <b>→</b></Link><Link href="/store">Explorar capacidades <b>→</b></Link><Link href="/terminal">Abrir terminal <b>→</b></Link></div></section>
  </main>
}
