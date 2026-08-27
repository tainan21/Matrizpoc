import { approveRecipe, createProjectRegistration, type ProjectRegistration } from "../domain/project"
import { computeRecipeRevision, type ProjectRecipe, type ProjectRecipeMaterial } from "../domain/recipe"
import type { ProjectFileReaderPort, ProjectRootStorePort } from "../ports"
import { detectNodeProject } from "../integration/node-project-detector"
import { AtomicProjectStore, type NativeProjectRecord } from "../integration/atomic-project-store"

type Options = {
  roots: ProjectRootStorePort
  reader: ProjectFileReaderPort
  store: AtomicProjectStore
  id(): string
  now(): string
  desktop: boolean
}

function materialize(files: Awaited<ReturnType<ProjectFileReaderPort["readEvidence"]>>): ProjectRecipe {
  const candidate = detectNodeProject(files)
  const permissions: ProjectRecipeMaterial["permissions"] = ["project.inspect", "project.register", "project.logs.read"]
  if (candidate.prepareActions.length) permissions.push("project.dependencies.install")
  if (candidate.runActions.length) permissions.push("project.process.start", "project.process.stop")
  if (candidate.surfaces.some((surface) => surface.kind === "embedded-web")) permissions.push("project.surface.embed", "project.surface.open_external")
  const recipeMaterial: ProjectRecipeMaterial = {
    detectors: [...candidate.detectors],
    prepareActions: [...candidate.prepareActions],
    runActions: [...candidate.runActions],
    surfaces: [...candidate.surfaces],
    permissions,
  }
  return { ...recipeMaterial, revision: computeRecipeRevision(recipeMaterial) }
}

export class ProjectHostService {
  constructor(private readonly options: Options) {}

  async list(): Promise<readonly ProjectRegistration[]> {
    return (await this.options.store.listNative()).map((item) => item.registration)
  }

  async registerCandidate(candidateId: string): Promise<ProjectRegistration> {
    if (!this.options.desktop) throw new Error("Local project registration requires the desktop")
    const root = await this.options.roots.registerCandidate(candidateId)
    const recipe = materialize(await this.options.reader.readEvidence(root.rootRef))
    const registration = createProjectRegistration({ id: this.options.id(), displayName: root.displayName, canonicalRootRef: root.rootRef, source: "local", recipeRevision: recipe.revision, now: this.options.now() })
    await this.options.store.save({ registration, canonicalPath: root.canonicalPath, recipe, sessions: [], preparationEvidence: null, surfacePreference: null, reconciliation: null })
    return registration
  }

  async approve(projectId: string, recipeRevision: string): Promise<ProjectRegistration> {
    const record = await this.required(projectId)
    const registration = approveRecipe(record.registration, recipeRevision, this.options.now())
    await this.options.store.save({ ...record, registration })
    return registration
  }

  async inspect(projectId: string): Promise<ProjectRegistration> {
    const record = await this.required(projectId)
    const recipe = materialize(await this.options.reader.readEvidence(record.registration.canonicalRootRef))
    const changed = recipe.revision !== record.registration.recipeRevision
    const registration: ProjectRegistration = changed
      ? Object.freeze({ ...record.registration, recipeRevision: recipe.revision, trust: "unreviewed" as const, state: "needs_review" as const, updatedAt: this.options.now() })
      : record.registration
    await this.options.store.save({ ...record, recipe, registration, preparationEvidence: changed ? null : record.preparationEvidence })
    return registration
  }

  async remove(projectId: string): Promise<void> {
    await this.required(projectId)
    await this.options.store.remove(projectId)
  }

  private async required(projectId: string): Promise<NativeProjectRecord> {
    const record = await this.options.store.findNative(projectId)
    if (!record) throw new Error("Unknown project")
    return record
  }
}
