import { useEffect } from "react"

const BEFORE_NAVIGATION = "matriz:before-workspace-navigation"

export function requestWorkspaceNavigation() {
  return window.dispatchEvent(new Event(BEFORE_NAVIGATION, { cancelable: true }))
}

export function useWorkspaceNavigationGuard(blocked: boolean) {
  useEffect(() => {
    if (!blocked) return
    const preventDiscard = (event: Event) => {
      if (!window.confirm("Descartar alterações não salvas deste ambiente?")) event.preventDefault()
    }
    window.addEventListener(BEFORE_NAVIGATION, preventDiscard)
    return () => window.removeEventListener(BEFORE_NAVIGATION, preventDiscard)
  }, [blocked])
}
