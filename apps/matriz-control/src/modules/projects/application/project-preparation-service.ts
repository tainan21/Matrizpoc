import type { ProjectAction } from "../domain/recipe"
import { AtomicProjectStore } from "../integration/atomic-project-store"

type Confirmation = { projectId: string; recipeRevision: string; actionId: string; expiresAt: number }

type Options = {
  store: AtomicProjectStore
  now(): number
  token(): string
  execute(action: ProjectAction): Promise<{ exitCode: number }>
}

export type ProjectPreparationPreview = Readonly<{
  projectId: string
  recipeRevision: string
  actionId: string
  executable: string
  args: readonly string[]
  workingDirectory: "project-root"
  expectedDiskChanges: readonly string[]
  warning: string
  confirmationToken: string
  expiresAt: number
}>

export class ProjectPreparationService {
  private readonly confirmations = new Map<string, Confirmation>()
  constructor(private readonly options: Options) {}

  async preview(projectId: string, recipeRevision: string): Promise<ProjectPreparationPreview> {
    const record = await this.required(projectId)
    if (record.registration.recipeRevision !== recipeRevision || record.recipe.revision !== recipeRevision) throw new Error("Recipe revision is stale")
    if (record.registration.trust !== "reviewed") throw new Error("Recipe requires review")
    const action = record.recipe.prepareActions[0]
    if (!action) throw new Error("Project has no preparation action")
    const confirmationToken = this.options.token()
    const expiresAt = this.options.now() + 120_000
    this.confirmations.set(confirmationToken, { projectId, recipeRevision, actionId: action.id, expiresAt })
    return {
      projectId,
      recipeRevision,
      actionId: action.id,
      executable: action.executable,
      args: [...action.args],
      workingDirectory: "project-root",
      expectedDiskChanges: ["Project-local dependency files may change."],
      warning: "Package-manager lifecycle scripts may execute.",
      confirmationToken,
      expiresAt,
    }
  }

  async prepare(projectId: string, recipeRevision: string, confirmationToken: string): Promise<{ exitCode: number }> {
    const confirmation = this.confirmations.get(confirmationToken)
    if (!confirmation) throw new Error("Preparation confirmation is invalid or already used")
    this.confirmations.delete(confirmationToken)
    if (confirmation.expiresAt < this.options.now()) throw new Error("Preparation confirmation expired")
    if (confirmation.projectId !== projectId || confirmation.recipeRevision !== recipeRevision) throw new Error("Preparation confirmation does not match project and recipe")
    const record = await this.required(projectId)
    if (record.registration.recipeRevision !== recipeRevision || record.recipe.revision !== recipeRevision) throw new Error("Recipe revision is stale")
    const action = record.recipe.prepareActions.find((item) => item.id === confirmation.actionId)
    if (!action) throw new Error("Approved preparation action is unavailable")
    const result = await this.options.execute(action)
    await this.options.store.save({ ...record, preparationEvidence: { recipeRevision, completedAt: new Date(this.options.now()).toISOString(), exitCode: result.exitCode } })
    return result
  }

  private async required(projectId: string) {
    const record = await this.options.store.findNative(projectId)
    if (!record) throw new Error("Unknown project")
    return record
  }
}
