type Tone = "ok" | "warning" | "danger" | "muted"
type Session = { projectId: string; status: "starting" | "running" | "stopping" | "exited" | "failed" }

export type PulseInput = {
  projects: readonly { id: string; name: string }[]
  sessions: readonly Session[]
  git: { available: boolean; dirty: boolean }
  doctor: { available: boolean; status: "healthy" | "warning" | "critical" | "unknown" }
}

export function presentPulse(input: PulseInput) {
  const running = input.sessions.filter((session) => session.status === "running" || session.status === "starting").length
  const attention = input.sessions.filter((session) => session.status === "failed" || session.status === "stopping").length
  const activeProjectIds = new Set(input.sessions.filter((session) => session.status === "running" || session.status === "starting").map((session) => session.projectId))
  return {
    sessions: { running, attention, total: input.sessions.length },
    projects: { known: input.projects.length, active: activeProjectIds.size },
    git: input.git.available ? input.git.dirty ? { label: "Mudanças pendentes", tone: "warning" as Tone } : { label: "Árvore limpa", tone: "ok" as Tone } : { label: "Git indisponível", tone: "muted" as Tone },
    doctor: !input.doctor.available ? { label: "Doctor indisponível", tone: "muted" as Tone } : input.doctor.status === "healthy" ? { label: "Ambiente saudável", tone: "ok" as Tone } : input.doctor.status === "critical" ? { label: "Ação crítica", tone: "danger" as Tone } : { label: "Atenção necessária", tone: "warning" as Tone },
  }
}
