import { chromium, type Page } from "@playwright/test"
import { spawn } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { createServer } from "node:net"

import { createWebView2Environment, waitForCdpEndpoint } from "./playwright/native-process"

function argument(name: string): string {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const binary = argument("--binary")
const configDirectory = argument("--config-directory")
const mode = argument("--mode")
if (mode !== "write" && mode !== "read") throw new Error("Mode must be write or read")

const expected = {
  theme: "industrial-ember",
  closeToTray: false,
  soundsEnabled: false,
  volume: 0.2,
  startWithWindows: false,
  terminalDockOpen: true,
  terminalDockHeight: 360,
  workspacePath: null,
}

await mkdir(configDirectory, { recursive: true })
const profileDirectory = `${configDirectory}-webview2-${mode}`
await mkdir(profileDirectory, { recursive: true })
const cdpPort = await reserveLoopbackPort()
const child = spawn(binary, [], {
  env: createWebView2Environment({ baseEnvironment: process.env, cdpPort, profileDirectory, configDirectory }),
  shell: false,
  stdio: "ignore",
  windowsHide: true,
})
const browser = await chromium.connectOverCDP(await waitForCdpEndpoint({ cdpPort }))
try {
  const page = browser.contexts()[0]?.pages()[0]
  if (!page) throw new Error("Installed Control did not expose its main page")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForFunction(() => Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__))
  if (mode === "write") {
    await invoke(page, "write_settings", { settings: expected })
  } else {
    const actual = await invoke<Record<string, unknown>>(page, "read_settings")
    for (const [key, value] of Object.entries(expected)) {
      if (actual[key] !== value) throw new Error(`Installed setting ${key} did not survive upgrade`)
    }
  }
  await invoke(page, "quit_app").catch(() => undefined)
} finally {
  await browser.close().catch(() => undefined)
  if (child.exitCode === null) child.kill()
}

process.stdout.write(JSON.stringify({ schemaVersion: "v1", mode, status: "pass" }))

function invoke<T>(page: Page, command: string, args?: Record<string, unknown>): Promise<T> {
  return page.evaluate(({ command, args }) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(name: string, input?: Record<string, unknown>): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(command, args), { command, args })
}

async function reserveLoopbackPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolveReady, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolveReady)
  })
  const address = server.address()
  await new Promise<void>((resolveClosed, reject) => server.close((error) => error ? reject(error) : resolveClosed()))
  if (!address || typeof address === "string") throw new Error("Could not reserve an upgrade CDP port")
  return address.port
}
