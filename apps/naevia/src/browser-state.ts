import type { BrowserSnapshot } from "./shared.js"

export function activateCapsule(snapshot: BrowserSnapshot, capsuleId: string): BrowserSnapshot {
  if (!snapshot.capsules.some((capsule) => capsule.id === capsuleId)) throw new Error("Cápsula desconhecida")
  const activeTab = snapshot.tabs.find((tab) => tab.capsuleId === capsuleId)
  if (!activeTab) throw new Error("Cápsula sem abas")
  return {
    ...snapshot,
    activeCapsuleId: capsuleId,
    activeTabId: activeTab.id,
    tabs: snapshot.tabs.map((tab) => ({ ...tab, active: tab.id === activeTab.id })),
  }
}
