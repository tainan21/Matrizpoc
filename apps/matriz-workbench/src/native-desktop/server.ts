import { createServer } from "node:net"
import path from "node:path"

export const WORKBENCH_DESKTOP_HOST = "127.0.0.1" as const
export const WORKBENCH_DESKTOP_PORT = 3005 as const

export class WorkbenchDesktopPortError extends Error {
  constructor(port: number = WORKBENCH_DESKTOP_PORT) {
    super(`${WORKBENCH_DESKTOP_HOST}:${port} já está em uso por outro processo. Feche-o ou escolha a instância já em execução.`)
  }
}

export function workbenchDesktopServer(installRoot: string) {
  return {
    host: WORKBENCH_DESKTOP_HOST,
    port: WORKBENCH_DESKTOP_PORT,
    serverPath: path.win32.join(
      installRoot,
      ".next",
      "standalone",
      "apps",
      "matriz-workbench",
      "server.js",
    ),
  }
}

export interface WorkbenchDesktopServerEnvironmentInput {
  workspaceRoot: string
  sessionToken: string
  inherited?: Record<string, string | undefined>
}

export function createWorkbenchDesktopServerEnvironment(
  input: WorkbenchDesktopServerEnvironmentInput,
): Record<string, string | undefined> {
  const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...inherited } = input.inherited ?? {}
  return {
    ...inherited,
    HOSTNAME: WORKBENCH_DESKTOP_HOST,
    PORT: String(WORKBENCH_DESKTOP_PORT),
    WORKBENCH_RUNTIME_MODE: "native-desktop",
    WORKBENCH_LOCAL_TOKEN: input.sessionToken,
    MATRIZ_REPO_ROOT: input.workspaceRoot,
  }
}

export async function assertWorkbenchDesktopPortAvailable(port: number = WORKBENCH_DESKTOP_PORT): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer()
    probe.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(new WorkbenchDesktopPortError(port))
        return
      }
      reject(error)
    })
    probe.listen({ host: WORKBENCH_DESKTOP_HOST, port, exclusive: true }, () => {
      probe.close((error) => error ? reject(error) : resolve())
    })
  })
}
