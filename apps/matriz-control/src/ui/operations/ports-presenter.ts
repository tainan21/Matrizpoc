type PortProject = { id: string; name: string; port: number | null }
type PortSession = { projectId: string; port: number | null; status: "starting" | "running" | "stopping" | "exited" | "failed" }

export function presentPorts(input: { projects: readonly PortProject[]; sessions: readonly PortSession[]; availability: ReadonlyMap<number, boolean> }) {
  return input.projects.map((project) => {
    if (!project.port) return { projectId: project.id, projectName: project.name, port: null, state: "undeclared" as const, label: "Sem porta declarada" }
    const controlled = input.sessions.some((session) => session.projectId === project.id && session.port === project.port && ["starting", "running", "stopping"].includes(session.status))
    if (controlled) return { projectId: project.id, projectName: project.name, port: project.port, state: "control-session" as const, label: "Em uso por sessão do Control" }
    if (input.availability.get(project.port) === true) return { projectId: project.id, projectName: project.name, port: project.port, state: "free" as const, label: "Livre" }
    return { projectId: project.id, projectName: project.name, port: project.port, state: "external" as const, label: "Indisponível ou em uso externamente" }
  })
}
