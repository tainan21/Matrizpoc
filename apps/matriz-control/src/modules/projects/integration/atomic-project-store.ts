import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { ProjectRegistration, ProjectSessionRecord } from "../domain/project"
import type { ProjectRecipe } from "../domain/recipe"
import { canonicalRootKey } from "../domain/root-policy"

export type NativeProjectRecord = Readonly<{
  registration: ProjectRegistration
  canonicalPath: string
  recipe: ProjectRecipe
  sessions: readonly ProjectSessionRecord[]
  preparationEvidence: Readonly<{ recipeRevision: string; completedAt: string; exitCode: number }> | null
  surfacePreference: string | null
  reconciliation: Readonly<{ state: "reconciled"; reason: string; at: string }> | null
}>

type CatalogFile = { version: 1; projects: NativeProjectRecord[] }

function parseCatalog(content: string): CatalogFile {
  try {
    const parsed = JSON.parse(content) as Partial<CatalogFile>
    if (parsed.version !== 1 || !Array.isArray(parsed.projects)) throw new Error()
    for (const item of parsed.projects) {
      if (!item || typeof item !== "object" || typeof item.canonicalPath !== "string" || typeof item.registration?.id !== "string" || typeof item.recipe?.revision !== "string" || !Array.isArray(item.sessions)) throw new Error()
    }
    return parsed as CatalogFile
  } catch { throw new Error("Project catalog is corrupt") }
}

export class AtomicProjectStore {
  constructor(private readonly path: string) {}

  private async read(): Promise<CatalogFile> {
    try { return parseCatalog(await readFile(this.path, "utf8")) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, projects: [] }
      throw error
    }
  }

  private async write(catalog: CatalogFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.tmp`
    await writeFile(temporary, JSON.stringify(catalog), { encoding: "utf8", mode: 0o600 })
    await rename(temporary, this.path)
  }

  async listNative(): Promise<readonly NativeProjectRecord[]> {
    return structuredClone((await this.read()).projects)
  }

  async findNative(projectId: string): Promise<NativeProjectRecord | undefined> {
    return (await this.listNative()).find((item) => item.registration.id === projectId)
  }

  async save(record: NativeProjectRecord): Promise<void> {
    const catalog = await this.read()
    const duplicate = catalog.projects.find((item) => item.registration.id !== record.registration.id && canonicalRootKey(item.canonicalPath) === canonicalRootKey(record.canonicalPath))
    if (duplicate) throw new Error("Project root is already registered")
    const normalized: NativeProjectRecord = { ...record, sessions: [...record.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-50) }
    const index = catalog.projects.findIndex((item) => item.registration.id === record.registration.id)
    if (index === -1) catalog.projects.push(normalized)
    else catalog.projects[index] = normalized
    await this.write(catalog)
  }

  async remove(projectId: string): Promise<void> {
    const catalog = await this.read()
    catalog.projects = catalog.projects.filter((item) => item.registration.id !== projectId)
    await this.write(catalog)
  }
}
