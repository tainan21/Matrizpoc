import Link from "next/link"

const tabs = [
  ["Visão geral", ""],
  ["Roadmap", "/roadmap"],
  ["Colaborar", "/collaboration"],
  ["Backlog", "/backlog"],
  ["Docs", "/docs"],
  ["Decisões", "/decisions"],
  ["Agentes", "/agents"],
  ["Atividade", "/activity"],
] as const

export function ProjectHeader({
  projectId,
  name,
  description,
}: {
  projectId: string
  name: string
  description?: string
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {projectId === "matriz-infra-hub" ? "raiz do repositório" : `apps/${projectId}`}
          </p>
          <h1>{name}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="status-chip success"><i /> workspace ativo</span>
      </header>
      <nav className="project-tabs" aria-label="Áreas do projeto">
        {tabs.map(([label, suffix]) => (
          <Link key={label} href={`/projects/${projectId}${suffix}`}>{label}</Link>
        ))}
      </nav>
    </>
  )
}
