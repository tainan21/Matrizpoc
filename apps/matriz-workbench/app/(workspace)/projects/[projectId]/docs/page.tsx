import Link from "next/link"
import { notFound } from "next/navigation"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"
import { MarkdownEditor } from "../../../../../src/ui/components/markdown-editor"
import { writeDocumentAction } from "../../../../actions"

export default async function DocsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const documents = await repository.listDocuments(projectId)
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description="Conhecimento humano em Markdown, próximo ao código e versionado pelo Git." />
      <section className="docs-layout">
        <div className="docs-index">
          <div className="section-heading"><h2>Documentos</h2><span>{documents.length}</span></div>
          {documents.map((document) => (
            <Link href={`/projects/${projectId}/docs/${document.kind}/${document.slug}`} key={document.id}>
              <span className="doc-icon">{document.kind === "decision" ? "ADR" : "MD"}</span>
              <span><strong>{document.title}</strong><small>{document.kind} · {document.slug}</small></span>
              <time>{new Date(document.updatedAt).toLocaleDateString("pt-BR")}</time>
            </Link>
          ))}
          {!documents.length ? <div className="empty-inline"><strong>Biblioteca vazia</strong><span>Comece pelo documento que reduzirá mais dúvidas.</span></div> : null}
        </div>
        <details className="composer" open={!documents.length}>
          <summary>Novo documento</summary>
          <form action={writeDocumentAction} className="form-grid">
            <input type="hidden" name="projectId" value={projectId} />
            <label>Título<input name="title" required maxLength={180} /></label>
            <label>Tipo<select name="kind" defaultValue="technical"><option value="product">Produto</option><option value="technical">Técnico</option><option value="decision">Decisão</option></select></label>
            <label>Slug<input name="slug" required pattern="[a-z0-9][a-z0-9-]*" placeholder="arquitetura-local-first" /></label>
            <label>Tags<input name="tags" placeholder="arquitetura, mcp" /></label>
            <div className="wide"><MarkdownEditor name="content" initialValue={"# Contexto\n\n## Decisão\n\n## Consequências\n"} /></div>
            <div className="form-actions wide"><button className="button primary" type="submit">Salvar documento</button></div>
          </form>
        </details>
      </section>
    </main>
  )
}
