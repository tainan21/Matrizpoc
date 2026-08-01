import { notFound } from "next/navigation"
import type { WorkbenchDocument } from "../../../../../../../src/domain/schemas"
import { WorkspaceRepository } from "../../../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../../../src/ui/components/project-header"
import { MarkdownEditor } from "../../../../../../../src/ui/components/markdown-editor"
import { writeDocumentAction } from "../../../../../../actions"

export default async function DocumentPage({ params }: { params: Promise<{ projectId: string; kind: string; slug: string }> }) {
  const { projectId, kind, slug } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace || !["product", "technical", "decision"].includes(kind)) notFound()
  const document = await repository.readDocument(projectId, kind as WorkbenchDocument["kind"], slug).catch(() => notFound())
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description={`${document.kind}/${document.slug}.md`} />
      <form action={writeDocumentAction} className="document-form">
        <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="kind" value={document.kind} /><input type="hidden" name="slug" value={document.slug} /><input type="hidden" name="revision" value={document.revision} />
        <div className="document-title-row">
          <input className="title-input" name="title" defaultValue={document.title} required />
          <input name="tags" defaultValue={document.tags.join(", ")} placeholder="tags" />
          <button className="button primary" type="submit">Salvar</button>
        </div>
        <MarkdownEditor name="content" initialValue={document.content} />
      </form>
    </main>
  )
}
