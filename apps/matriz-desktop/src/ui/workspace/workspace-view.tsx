import { useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DesktopAppId, RuntimeInstance } from "../../domain/types"
import { EnvironmentManager } from "./environment-manager"
import { FileExplorer } from "./file-explorer"

export function WorkspaceView({ gateway, runtimes, restart, signal }: {
  gateway: DesktopGateway
  runtimes: readonly RuntimeInstance[]
  restart(appId: DesktopAppId): Promise<unknown>
  signal(kind: "success" | "error"): void
}) {
  const [surface, setSurface] = useState<"environment" | "files">("environment")
  return <div className="workspace-view">
    <nav className="workspace-tabs" aria-label="Recursos do workspace">
      <button aria-current={surface === "environment" ? "page" : undefined} onClick={() => setSurface("environment")}>AMBIENTES</button>
      <button aria-current={surface === "files" ? "page" : undefined} onClick={() => setSurface("files")}>ARQUIVOS & ATIVOS</button>
    </nav>
    {surface === "environment" ? <EnvironmentManager gateway={gateway} runtimes={runtimes} restart={restart} signal={signal} /> : <FileExplorer gateway={gateway} runtimes={runtimes} signal={signal} />}
  </div>
}
