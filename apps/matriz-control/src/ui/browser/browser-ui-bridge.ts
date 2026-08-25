import type { DesktopCommand } from "../../application/desktop-bridge"
import type { BrowserTabPayload } from "./browser-presenter"

export type BrowserUiResult = unknown
export type BrowserUiEvent =
  | { type: "tab.updated"; tab: BrowserTabPayload }
  | { type: "tab.closed"; tabId: string }
  | { type: "download.updated"; id: string; filename: string; state: "progressing" | "completed" | "cancelled" | "failed" }
  | { type: "permission.requested"; capsuleId: string; origin: string; permission: string }
  | { type: "runtime.failed"; message: string }

export interface BrowserUiBridge {
  invoke(command: DesktopCommand): Promise<BrowserUiResult>
  subscribe(listener: (event: BrowserUiEvent) => void): () => void
  reportViewport(bounds: { x: number; y: number; width: number; height: number; visible: boolean }): void
}

declare global { interface Window { matrizDesktop?: BrowserUiBridge } }
