import type { DesktopGateway } from "../domain/types"
import { browserGateway } from "./browser-gateway"

declare global { interface Window { matrizUninstall?: DesktopGateway; __TAURI_INTERNALS__?: unknown } }

export async function resolveDesktopGateway(): Promise<DesktopGateway> {
  if (window.matrizUninstall) return window.matrizUninstall
  if (window.__TAURI_INTERNALS__) return (await import("./tauri-gateway")).tauriGateway
  return browserGateway
}

