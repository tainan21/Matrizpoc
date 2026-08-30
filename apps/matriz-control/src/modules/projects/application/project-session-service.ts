import type { ProjectState } from "../domain/project"
import { AtomicProjectStore } from "../integration/atomic-project-store"
import { assertExpectedPortsAvailable, type ReadinessResult } from "../integration/project-readiness"

type SupervisorSession = { id: string; pid: number | null; status: string }
type Supervisor = {
  start(projectId: string, actionId: string): Promise<SupervisorSession>
  get(sessionId: string): SupervisorSession | undefined
  stop(sessionId: string): Promise<void>
  restart(sessionId: string): Promise<SupervisorSession>
}
type Readiness = { wait(probe: NonNullable<import("../domain/recipe").ReadinessProbe>, port: number, isAlive: () => boolean): Promise<ReadinessResult> }

type Options = { store: AtomicProjectStore; supervisor: Supervisor; portAvailable(port: number): Promise<boolean>; readiness: Readiness; now(): string; dependencyGate?: { assertProjectReady(projectRoot: string): Promise<void> } }

export class ProjectSessionService {
  constructor(private readonly options: Options) {}

  async start(projectId: string, actionId: string, recipeRevision: string) {
    const record = await this.required(projectId)
    if (record.registration.recipeRevision !== recipeRevision || record.recipe.revision !== recipeRevision) throw new Error("Recipe revision is stale")
    if (record.registration.trust !== "reviewed") throw new Error("Recipe requires review")
    const action = record.recipe.runActions.find((item) => item.id === actionId)
    if (!action) throw new Error("Unknown approved action")
    await this.options.dependencyGate?.assertProjectReady(record.canonicalPath)
    const ports = action.requestedPorts.map((item) => item.port)
    await assertExpectedPortsAvailable(ports, this.options.portAvailable)
    const session = await this.options.supervisor.start(projectId, actionId)
    let readiness: ReadinessResult = { state: "ready" }
    if (action.readiness && ports[0]) readiness = await this.options.readiness.wait(action.readiness, ports[0], () => ["starting", "running"].includes(this.options.supervisor.get(session.id)?.status ?? ""))
    const state: ProjectState = readiness.state === "ready" ? "running" : readiness.state
    const sessionRecord = { sessionId: session.id, projectId, actionId, recipeRevision, pid: session.pid, expectedPorts: ports, state, startedAt: this.options.now(), endedAt: null, result: "reason" in readiness ? readiness.reason : null }
    await this.options.store.save({ ...record, registration: { ...record.registration, state, updatedAt: this.options.now() }, sessions: [...record.sessions, sessionRecord] })
    return { state, sessionId: session.id, readinessUrl: "url" in readiness ? readiness.url : undefined }
  }

  async stop(projectId: string, sessionId: string): Promise<void> {
    const record = await this.required(projectId)
    const session = record.sessions.find((item) => item.sessionId === sessionId)
    if (!session) throw new Error("Session does not belong to project")
    await this.options.supervisor.stop(sessionId)
  }

  async restart(projectId: string, sessionId: string) {
    const record = await this.required(projectId)
    if (!record.sessions.some((item) => item.sessionId === sessionId)) throw new Error("Session does not belong to project")
    return this.options.supervisor.restart(sessionId)
  }

  async reconcile(): Promise<void> {
    for (const record of await this.options.store.listNative()) {
      let disappeared = false
      const sessions = record.sessions.map((session) => {
        if (["starting", "running", "degraded", "stopping"].includes(session.state) && !this.options.supervisor.get(session.sessionId)) {
          disappeared = true
          return { ...session, state: "stopped" as const, endedAt: this.options.now(), result: "process-disappeared" }
        }
        return session
      })
      if (disappeared) await this.options.store.save({ ...record, registration: { ...record.registration, state: "stopped", updatedAt: this.options.now() }, sessions, reconciliation: { state: "reconciled", reason: "process-disappeared", at: this.options.now() } })
    }
  }

  private async required(projectId: string) {
    const record = await this.options.store.findNative(projectId)
    if (!record) throw new Error("Unknown project")
    return record
  }
}
