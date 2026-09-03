export interface AppGroup {
  readonly id: string
  readonly name: string
  readonly projectIds: readonly string[]
}

export const APP_GROUPS_STORAGE_KEY = "matriz-control:app-groups:v1"
export const APP_ORDER_STORAGE_KEY = "matriz-control:app-order:v1"

// The default sequence is deliberately explicit: foundation services start before
// product surfaces, while the remaining catalog keeps a stable alphabetical tail.
export const APP_PRIORITY = [
  "matriz-hub",
  "matriz-workbench",
  "matriz-control",
  "matriz-admin",
  "contracts",
  "spot",
  "willdash",
  "sites",
  "matrizlib",
  "seumei",
  "matriz-ops",
  "health",
  "matriz-uninstall",
] as const

export function priorityIndex(id: string): number {
  const index = APP_PRIORITY.indexOf(id as (typeof APP_PRIORITY)[number])
  return index === -1 ? APP_PRIORITY.length : index
}

export function orderAppIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((a, b) => priorityIndex(a) - priorityIndex(b) || a.localeCompare(b))
}

export function reorderIds(ids: readonly string[], draggedId: string, targetId: string): string[] {
  if (draggedId === targetId || !ids.includes(draggedId) || !ids.includes(targetId)) return [...ids]
  const next = [...ids]
  const from = next.indexOf(draggedId)
  const to = next.indexOf(targetId)
  next.splice(from, 1)
  next.splice(to, 0, draggedId)
  return next
}

export function moveId(ids: readonly string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id)
  const nextIndex = index + direction
  if (index === -1 || nextIndex < 0 || nextIndex >= ids.length) return [...ids]
  const next = [...ids]
  next.splice(index, 1)
  next.splice(nextIndex, 0, id)
  return next
}

export function createDefaultAppGroup(projectIds: readonly string[]): AppGroup {
  return { id: "matriz", name: "Matriz", projectIds: orderAppIds(projectIds) }
}

export function createGroupId(name: string, existingIds: readonly string[]): string {
  const base = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "grupo"
  let id = base
  let suffix = 2
  while (existingIds.includes(id)) id = `${base}-${suffix++}`
  return id
}

export function normalizeAppGroups(value: unknown, knownIds: readonly string[]): AppGroup[] {
  const known = new Set(knownIds)
  const stored = Array.isArray(value) ? value : []
  const groups = stored.flatMap((item): AppGroup[] => {
    if (!item || typeof item !== "object") return []
    const candidate = item as { id?: unknown; name?: unknown; projectIds?: unknown }
    if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !Array.isArray(candidate.projectIds)) return []
    const projectIds = [...new Set(candidate.projectIds.filter((id): id is string => typeof id === "string" && known.has(id)))]
    return [{ id: candidate.id, name: candidate.name.trim() || "Grupo sem nome", projectIds }]
  })
  const unique = groups.filter((group, index) => groups.findIndex((item) => item.id === group.id) === index)
  const matrix = unique.find((group) => group.id === "matriz")
  const withMatrix = matrix ? unique.map((group) => group.id === "matriz" ? { ...group, name: "Matriz", projectIds: mergeKnownIds(group.projectIds, knownIds) } : group) : [createDefaultAppGroup(knownIds), ...unique]
  return withMatrix.length ? withMatrix : [createDefaultAppGroup(knownIds)]
}

function mergeKnownIds(current: readonly string[], knownIds: readonly string[]): string[] {
  const currentSet = new Set(current)
  return [...current, ...orderAppIds(knownIds.filter((id) => !currentSet.has(id)))]
}
