import "server-only"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { EvolutionActivityItem, EvolutionBacklogItem, EvolutionInput } from "./evolution-presenter"

function matrizRoot(): string {
  const local = join(process.cwd(), ".matriz")
  if (existsSync(local)) return local
  return join(process.cwd(), "apps", "matriz-hub", ".matriz")
}

function parseJson<T>(path: string, fallback: T): T {
  try { return JSON.parse(readFileSync(path, "utf8")) as T } catch { return fallback }
}

function listFiles(path: string, extension: string): string[] {
  try { return readdirSync(path).filter((file) => file.endsWith(extension)).map((file) => join(path, file)) } catch { return [] }
}

export function readEvolutionSource(): EvolutionInput & { readonly root: string; readonly errors: readonly string[] } {
  const root = matrizRoot()
  const errors: string[] = []
  const roadmap = parseJson<{ phases?: unknown[]; goals?: unknown[] }>(join(root, "roadmap.json"), {})
  if (!existsSync(join(root, "roadmap.json"))) errors.push("roadmap.json não encontrado")

  const backlog = listFiles(join(root, "backlog"), ".json").map((path) => parseJson<EvolutionBacklogItem | null>(path, null)).filter((item): item is EvolutionBacklogItem => Boolean(item?.id))
  const activity = listFiles(join(root, "activity"), ".jsonl").flatMap((path) => {
    try {
      return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as EvolutionActivityItem)
    } catch {
      errors.push(`atividade inválida: ${path.split(/[\\/]/).pop()}`)
      return []
    }
  })

  return { phases: roadmap.phases ?? [], goals: roadmap.goals ?? [], backlog, activity, root, errors }
}
