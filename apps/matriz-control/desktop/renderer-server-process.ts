export interface RendererServerProcess {
  kill(): boolean
}

type RendererProcessFork = (
  modulePath: string,
  args?: string[],
  options?: {
    cwd?: string
    env?: Record<string, string | undefined>
    serviceName?: string
    stdio?: string
  },
) => RendererServerProcess

export function startPackagedRenderer(input: {
  fork: RendererProcessFork
  serverPath: string
  cwd: string
  baseEnv: Record<string, string | undefined>
}): RendererServerProcess {
  const env = { ...input.baseEnv }
  delete env.ELECTRON_RUN_AS_NODE

  return input.fork(input.serverPath, [], {
    cwd: input.cwd,
    env: {
      ...env,
      MATRIZ_CONTROL_RUNTIME: "desktop-packaged",
      HOSTNAME: "127.0.0.1",
      PORT: "3009",
    },
    serviceName: "Matriz Control Renderer",
    stdio: "ignore",
  })
}
