export const PROJECT_STATES = [
  "unknown", "inspecting", "needs_review", "ready", "preparing", "starting",
  "running", "degraded", "stopping", "stopped", "blocked", "failed",
] as const

export type ProjectState = typeof PROJECT_STATES[number]
export type ProjectSource = "monorepo" | "local"
export type ProjectTrust = "unreviewed" | "reviewed"

export type ProjectRegistration = Readonly<{
  id: string
  displayName: string
  canonicalRootRef: string
  source: ProjectSource
  trust: ProjectTrust
  recipeRevision: string
  state: ProjectState
  createdAt: string
  updatedAt: string
}>

export type ProjectSessionRecord = Readonly<{
  sessionId: string
  projectId: string
  actionId: string
  recipeRevision: string
  pid: number | null
  expectedPorts: readonly number[]
  state: ProjectState
  startedAt: string
  endedAt: string | null
  result: string | null
}>

export function createProjectRegistration(input: Omit<ProjectRegistration, "trust" | "state" | "createdAt" | "updatedAt"> & { now: string }): ProjectRegistration {
  return Object.freeze({
    id: input.id,
    displayName: input.displayName,
    canonicalRootRef: input.canonicalRootRef,
    source: input.source,
    trust: "unreviewed" as const,
    recipeRevision: input.recipeRevision,
    state: "needs_review" as const,
    createdAt: input.now,
    updatedAt: input.now,
  })
}

export function approveRecipe(registration: ProjectRegistration, recipeRevision: string, now: string): ProjectRegistration {
  if (registration.recipeRevision !== recipeRevision) throw new Error("Recipe revision is stale")
  return Object.freeze({ ...registration, trust: "reviewed" as const, state: "ready" as const, updatedAt: now })
}
