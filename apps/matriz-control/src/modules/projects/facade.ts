import type { ProjectHostService } from "./application/project-host-service"
import type { ProjectPreparationService } from "./application/project-preparation-service"
import type { ProjectSessionService } from "./application/project-session-service"
import type { RootCandidatePort } from "./ports"

export class ProjectHostFacade {
  constructor(private readonly dependencies: { roots: RootCandidatePort; host: ProjectHostService; preparation: ProjectPreparationService; sessions: ProjectSessionService }) {}

  list() { return this.dependencies.host.list() }
  inspect(projectId: string) { return this.dependencies.host.inspect(projectId) }
  approve(projectId: string, revision: string) { return this.dependencies.host.approve(projectId, revision) }
  previewPreparation(projectId: string, revision: string) { return this.dependencies.preparation.preview(projectId, revision) }
  prepare(projectId: string, revision: string, token: string) { return this.dependencies.preparation.prepare(projectId, revision, token) }
  start(projectId: string, actionId: string, revision: string) { return this.dependencies.sessions.start(projectId, actionId, revision) }
  stop(projectId: string, sessionId: string) { return this.dependencies.sessions.stop(projectId, sessionId) }
  restart(projectId: string, sessionId: string) { return this.dependencies.sessions.restart(projectId, sessionId) }
  remove(projectId: string) { return this.dependencies.host.remove(projectId) }
  async pickAndRegister() {
    const candidate = await this.dependencies.roots.pick()
    return candidate ? this.dependencies.host.registerCandidate(candidate.candidateId) : null
  }
  reconcile() { return this.dependencies.sessions.reconcile() }
}
