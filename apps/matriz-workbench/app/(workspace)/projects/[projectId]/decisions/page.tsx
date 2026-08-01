import Link from "next/link"
import { notFound } from "next/navigation"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"

export default async function DecisionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const decisions = (await repository.listDocuments(projectId)).filter((document) => document.kind === "decision")
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description="Decisões técnicas curtas, explícitas e revisáveis." />
      <section className="decision-list">
        <div className="table-head"><span>Decisão</span><span>Atualizada</span><span>Estado</span></div>
        {decisions.map((decision, index) => (
          <Link href={`/projects/${projectId}/docs/decision/${decision.slug}`} key={decision.id}>
            <span className="decision-number">ADR-{String(index + 1).padStart(3, "0")}</span>
            <span className="row-main"><strong>{decision.title}</strong><small>{decision.tags.map((tag) => `#${tag}`).join(" ") || "sem tags"}</small></span>
            <time>{new Date(decision.updatedAt).toLocaleDateString("pt-BR")}</time>
            <span className="status-chip success">vigente</span>
          </Link>
        ))}
        {!decisions.length ? <div className="empty-inline"><strong>Nenhuma decisão registrada</strong><span>Crie um documento do tipo Decisão na área Docs.</span><Link href={`/projects/${projectId}/docs`}>Criar decisão</Link></div> : null}
      </section>
    </main>
  )
}
