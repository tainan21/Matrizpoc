import Link from "next/link"
import { notFound } from "next/navigation"
import { buildCollaborationPrompt } from "../../../../../src/application/collaboration-brief"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { CopyPromptButton } from "../../../../../src/ui/components/copy-prompt-button"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"

export default async function CollaborationPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const roadmap = await repository.getRoadmap(projectId)
  const prompt = buildCollaborationPrompt(project, roadmap)
  const score = roadmap.goals.filter((goal) => goal.score === 1).length

  return (
    <main className="workspace-page">
      <ProjectHeader
        projectId={projectId}
        name={project.workspace.displayName}
        description="Uma passagem de bastão curta entre você, ChatGPT e Codex."
      />
      <div className="collaboration-layout">
        <section className="collaboration-main">
          <header className="round-header">
            <div>
              <span className="score-kicker">Próxima rodada</span>
              <h2>Continuar com contexto, não com prompts gigantes</h2>
              <p>O briefing usa projeto, stack e próximos pontos ainda em zero.</p>
            </div>
            <strong>{score}/100</strong>
          </header>
          <pre className="prompt-preview">{prompt}</pre>
          <div className="prompt-actions">
            <CopyPromptButton prompt={prompt} />
            <span>{prompt.length.toLocaleString("pt-BR")} caracteres</span>
          </div>
        </section>

        <aside className="collaboration-guide">
          <section>
            <span className="score-kicker">Onde continuar</span>
            <h3>Neste chat</h3>
            <p>Continue aqui enquanto o objetivo e o working tree forem os mesmos.</p>
            <h3>Novo chat</h3>
            <p>Abra outro somente para outro projeto, investigação isolada ou decisão sem dependência deste contexto.</p>
          </section>
          <section>
            <span className="score-kicker">Personas</span>
            <p>Use Product, Arquitetura, UX e Segurança como lentes sequenciais do mesmo trabalho — não como agentes paralelos.</p>
          </section>
          <section>
            <span className="score-kicker">Plugins</span>
            <dl className="plugin-list">
              <div><dt>Agora</dt><dd>Nenhum obrigatório</dd></div>
              <div><dt>GitHub</dt><dd><Link href={`/projects/${projectId}/collaboration/github`}>Preparar issues e handoff</Link></dd></div>
              <div><dt>Alertas</dt><dd><Link href={`/projects/${projectId}/collaboration/notifications`}>Configurar outbox local</Link></dd></div>
              <div><dt>Figma</dt><dd>Somente com arquivo de design canônico</dd></div>
              <div><dt>Notion</dt><dd>Apenas para importação ou exportação</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  )
}
