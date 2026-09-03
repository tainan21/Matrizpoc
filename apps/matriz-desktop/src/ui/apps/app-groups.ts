import type { DesktopAppId } from "../../domain/types"

export interface DesktopAppGroup { readonly id: string; readonly name: string; readonly appIds: readonly DesktopAppId[] }

export const DESKTOP_APP_GROUPS_KEY = "matriz-control:desktop-app-groups:v1"
const priority: readonly DesktopAppId[] = ["matriz-hub", "matriz-workbench", "matriz-admin", "contracts", "spot", "willdash", "sites", "matrizlib", "seumei", "matriz-ops", "health", "matriz-pay", "matriz-client-admin"]

export function orderDesktopApps(ids: readonly DesktopAppId[]): DesktopAppId[] {
  return [...new Set(ids)].sort((left, right) => (priority.indexOf(left) + 1 || priority.length + 1) - (priority.indexOf(right) + 1 || priority.length + 1) || left.localeCompare(right))
}

export function defaultDesktopAppGroup(): DesktopAppGroup {
  return { id: "matriz", name: "Matriz", appIds: orderDesktopApps(["matriz-hub", "spot", "matriz-admin", "contracts", "willdash", "matriz-workbench", "sites", "matrizlib", "seumei", "health", "matriz-ops", "matriz-pay", "matriz-client-admin"]) }
}

export function reorderDesktopApps(ids: readonly DesktopAppId[], draggedId: DesktopAppId, targetId: DesktopAppId): DesktopAppId[] {
  if (draggedId === targetId) return [...ids]
  const next = [...ids]
  const from = next.indexOf(draggedId)
  const to = next.indexOf(targetId)
  if (from < 0 || to < 0) return next
  next.splice(from, 1); next.splice(to, 0, draggedId)
  return next
}

export function normalizeDesktopAppGroups(value: unknown): DesktopAppGroup[] {
  const valid = new Set<DesktopAppId>(priority)
  const groups = Array.isArray(value) ? value.flatMap((item): DesktopAppGroup[] => {
    if (!item || typeof item !== "object") return []
    const candidate = item as { id?: unknown; name?: unknown; appIds?: unknown }
    if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !Array.isArray(candidate.appIds)) return []
    const appIds = candidate.appIds.filter((id): id is DesktopAppId => typeof id === "string" && valid.has(id as DesktopAppId))
    return [{ id: candidate.id, name: candidate.name.trim() || "Grupo sem nome", appIds: [...new Set(appIds)] }]
  }) : []
  const unique = groups.filter((group, index) => groups.findIndex((item) => item.id === group.id) === index)
  const matrix = unique.find((group) => group.id === "matriz") ?? defaultDesktopAppGroup()
  const matrixAppIds = [...new Set([...matrix.appIds, ...defaultDesktopAppGroup().appIds.filter((id) => !matrix.appIds.includes(id))])]
  return [{ ...matrix, name: "Matriz", appIds: matrixAppIds }, ...unique.filter((group) => group.id !== "matriz")]
}

export function desktopGroupId(name: string, existingIds: readonly string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "grupo"
  let id = base; let suffix = 2
  while (existingIds.includes(id)) id = `${base}-${suffix++}`
  return id
}
