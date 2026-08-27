"use client"

import type { ProjectViewModel } from "../../modules/projects/presentation/project-presenter"

export function ProjectLibrary({ projects, selectedId, loading, onSelect, onAdd }: { projects: readonly ProjectViewModel[]; selectedId: string | null; loading: boolean; onSelect(id: string): void; onAdd(): void }) {
  return <aside className="project-library"><header><div><span className="section-label">PROJECT HOST / {String(projects.length).padStart(2, "0")}</span><h1>Projetos</h1></div><button className="primary" onClick={onAdd}>Adicionar</button></header>
    {loading ? <p className="muted">Carregando projetos…</p> : projects.length ? <div className="project-library-list">{projects.map((project) => <button className={selectedId === project.id ? "selected" : ""} key={project.id} onClick={() => onSelect(project.id)}><i className={`status-dot ${project.state}`} /><span><strong>{project.name}</strong><small>{project.stackLabel} · {project.stateLabel}</small></span><b>{project.attention === "none" ? "›" : "!"}</b></button>)}</div> : <div className="project-empty"><strong>Nenhum projeto externo</strong><p>Adicione uma pasta para inspecionar. Nada será instalado ou executado nesta etapa.</p><button onClick={onAdd}>Escolher pasta</button></div>}
  </aside>
}
