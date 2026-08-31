export type DesktopConnectionState = "navigating" | "unavailable"

export async function connectToOps(invoke: () => Promise<void>): Promise<DesktopConnectionState> {
  try {
    await invoke()
    return "navigating"
  } catch {
    return "unavailable"
  }
}
