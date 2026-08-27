import type { ProjectAction, ProjectRecipe } from "./domain/recipe"
import type { ProjectRegistration, ProjectSessionRecord } from "./domain/project"

export interface RootCandidatePort { pick(): Promise<{ candidateId: string } | null> }
export interface ProjectRootStorePort {
  registerCandidate(candidateId: string): Promise<{ rootRef: string; canonicalPath: string; displayName: string }>
  resolve(rootRef: string): Promise<string>
  remove(rootRef: string): Promise<void>
}
export interface ProjectFileEvidence { relativePath: string; content: string; size: number }
export interface ProjectFileReaderPort { readEvidence(rootRef: string): Promise<readonly ProjectFileEvidence[]> }
export interface ProjectCatalogPort {
  list(): Promise<readonly ProjectRegistration[]>
  save(registration: ProjectRegistration, recipe: ProjectRecipe, sessions?: readonly ProjectSessionRecord[]): Promise<void>
  remove(projectId: string): Promise<void>
}
export interface ApprovedActionExecutorPort { execute(action: ProjectAction): Promise<{ sessionId: string }> }
