type EnvironmentInput = Readonly<{
  baseEnvironment: NodeJS.ProcessEnv
  cdpPort: number
  profileDirectory: string
  configDirectory: string
}>

type EndpointWaitInput = Readonly<{
  cdpPort: number
  timeoutMs?: number
  request?: (url: string) => Promise<Readonly<{ ok: boolean }>>
  pause?: (milliseconds: number) => Promise<void>
  now?: () => number
}>

type TemporaryRootRemovalInput = Readonly<{
  root: string
  temporaryRoot?: string
  remove?: (path: string) => Promise<void>
  pause?: (milliseconds: number) => Promise<void>
  attempts?: number
}>

export function createWebView2Environment(input: EnvironmentInput): NodeJS.ProcessEnv {
  return {
    ...input.baseEnvironment,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${input.cdpPort}`,
    WEBVIEW2_USER_DATA_FOLDER: input.profileDirectory,
    MATRIZ_CONTROL_ACCEPTANCE: "1",
    MATRIZ_CONTROL_ACCEPTANCE_CONFIG_DIR: input.configDirectory,
  }
}

export async function waitForCdpEndpoint(input: EndpointWaitInput): Promise<string> {
  const origin = `http://127.0.0.1:${input.cdpPort}`
  const endpoint = `${origin}/json/version`
  const request = input.request ?? fetch
  const pause = input.pause ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const now = input.now ?? Date.now
  const deadline = now() + (input.timeoutMs ?? 60_000)

  while (now() <= deadline) {
    try {
      if ((await request(endpoint)).ok) return origin
    } catch {
      // WebView2 has not opened its debugging socket yet.
    }
    await pause(100)
  }

  throw new Error(`Matriz Control WebView2 did not expose ${endpoint}`)
}

export async function removeTemporaryRoot(input: TemporaryRootRemovalInput): Promise<void> {
  const root = resolve(input.root)
  const temporaryRoot = resolve(input.temporaryRoot ?? tmpdir())
  const childPath = relative(temporaryRoot, root)
  if (!childPath || childPath.startsWith("..") || isAbsolute(childPath)) {
    throw new Error(`Refusing to remove a non-temporary Playwright directory: ${root}`)
  }
  const remove = input.remove ?? ((path: string) => rm(path, { recursive: true, force: true }))
  const pause = input.pause ?? ((milliseconds: number) => new Promise<void>((resolvePause) => setTimeout(resolvePause, milliseconds)))
  const attempts = input.attempts ?? 50
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await remove(root)
      return
    } catch (error) {
      lastError = error
      const code = (error as NodeJS.ErrnoException).code
      if (!code || !["EBUSY", "EPERM", "ENOTEMPTY"].includes(code) || attempt === attempts - 1) throw error
      await pause(100)
    }
  }
  throw lastError
}
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { isAbsolute, relative, resolve } from "node:path"
