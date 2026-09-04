import { chromium } from "@playwright/test"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { join } from "node:path"
import type { Page } from "@playwright/test"

import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"
import { createWebView2Environment, waitForCdpEndpoint } from "../playwright/native-process"

test("recovers defaults from corrupt settings without destroying the source", async ({ tauriApp }) => {
  const { page, configDirectory } = tauriApp
  const path = join(configDirectory, "settings.json")
  const corrupt = "{ definitely-not-valid-json"
  await writeFile(path, corrupt)

  const settings = await invoke<Record<string, unknown>>(page, "read_settings")
  expect(settings).toMatchObject({ theme: "matriz", closeToTray: true, soundsEnabled: true, volume: 0.45, startWithWindows: false, terminalDockOpen: false, terminalDockHeight: 280 })
  expect(await readFile(path, "utf8")).toBe(corrupt)
  await chooseMode(page, "Hub")
  await expect(page.locator("main h1")).toHaveText("MATRIZ HUB")
})

test("persists settings across a complete Control relaunch", async ({ tauriApp }) => {
  const { page, processId, configDirectory, binary } = tauriApp
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
  await invoke(page, "write_settings", { settings: expected })
  await invoke(page, "quit_app")
  await expect.poll(() => processExists(processId)).toBe(false)

  const profileDirectory = join(configDirectory, "relaunch-webview2")
  await mkdir(profileDirectory)
  const cdpPort = await reserveLoopbackPort()
  const child = spawn(binary, [], {
    env: createWebView2Environment({ baseEnvironment: process.env, cdpPort, profileDirectory, configDirectory }),
    shell: false,
    stdio: "ignore",
    windowsHide: true,
  })
  const browser = await chromium.connectOverCDP(await waitForCdpEndpoint({ cdpPort }))
  try {
    const relaunchedPage = browser.contexts()[0]?.pages()[0]
    if (!relaunchedPage) throw new Error("Relaunched Control did not expose its main page")
    await relaunchedPage.waitForLoadState("domcontentloaded")
    expect(await invoke(relaunchedPage, "read_settings")).toMatchObject(expected)
  } finally {
    await browser.close()
    if (child.exitCode === null) child.kill()
  }
})

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
  if (!address || typeof address === "string") throw new Error("Could not reserve a relaunch CDP port")
  return address.port
}

async function processExists(pid: number): Promise<boolean> {
  const process = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `if (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { 'yes' } else { 'no' }`], { windowsHide: true })
  let output = ""
  process.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString() })
  await once(process, "exit")
  return output.trim() === "yes"
}
