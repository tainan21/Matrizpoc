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

export function closeTab(snapshot: BrowserSnapshot, tabId: string): BrowserSnapshot {
  const closing = snapshot.tabs.find((tab) => tab.id === tabId)
  if (!closing) throw new Error("Aba desconhecida")
  const remaining = snapshot.tabs.filter((tab) => tab.id !== tabId)
  const replacement = remaining.find((tab) => tab.capsuleId === closing.capsuleId)
  if (!replacement) throw new Error("A última aba da cápsula não pode ser fechada")
  if (snapshot.activeTabId !== tabId) return { ...snapshot, tabs: remaining }
  return { ...snapshot, tabs: remaining.map((tab) => ({ ...tab, active: tab.id === replacement.id })), activeTabId: replacement.id }
}
