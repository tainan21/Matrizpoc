import type { AgentPolicy, BrowserSnapshot, CapsuleView, TabView } from "./shared.js"

interface LegacyCapsule { readonly id: string; readonly name: string; readonly policy: string }
interface LegacyTab { readonly id: string; readonly capsuleId: string; readonly title: string; readonly url: string; readonly active: boolean }

export function mapLegacyBrowserState(
  capsules: readonly LegacyCapsule[],
  tabs: readonly LegacyTab[],
  uuid: () => string,
): BrowserSnapshot {
  if (capsules.length > 100 || tabs.length > 500) throw new Error("O perfil legado excede o limite de importação")
  const ids = new Map<string, string>()
  const mappedCapsules: CapsuleView[] = capsules.flatMap((capsule) => {
    if (!capsule.id || !capsule.name.trim() || capsule.name.length > 50 || !isPolicy(capsule.policy)) return []
    const id = uuid(); ids.set(capsule.id, id)
    return [{ id, name: capsule.name.trim(), policy: capsule.policy }]
  })
  if (!mappedCapsules.length) throw new Error("Nenhuma cápsula válida foi encontrada")
  const mappedTabs: TabView[] = tabs.flatMap((tab) => {
    const capsuleId = ids.get(tab.capsuleId)
    if (!capsuleId || !webUrl(tab.url)) return []
    return [{ id: uuid(), capsuleId, title: tab.title.trim().slice(0, 120) || "Aba importada", url: tab.url, active: false, loading: false }]
  })
  for (const capsule of mappedCapsules) {
    if (!mappedTabs.some((tab) => tab.capsuleId === capsule.id)) mappedTabs.push({ id: uuid(), capsuleId: capsule.id, title: "Nova aba", url: "https://duckduckgo.com/", active: false, loading: false })
  }
  const preferredLegacy = tabs.find((tab) => tab.active)
  const preferredCapsule = preferredLegacy ? ids.get(preferredLegacy.capsuleId) : undefined
  const active = mappedTabs.find((tab) => tab.capsuleId === preferredCapsule) ?? mappedTabs[0]
  return {
    capsules: mappedCapsules,
    tabs: mappedTabs.map((tab) => ({ ...tab, active: tab.id === active.id })),
    activeCapsuleId: active.capsuleId,
    activeTabId: active.id,
  }
}

function isPolicy(value: string): value is AgentPolicy { return value === "human" || value === "agent-safe" || value === "agent-full" }
function webUrl(value: string) { try { return ["http:", "https:"].includes(new URL(value).protocol) } catch { return false } }
