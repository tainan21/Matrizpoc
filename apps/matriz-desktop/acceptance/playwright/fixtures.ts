import { chromium, expect, test as base, type Page } from "@playwright/test"
import { spawn, type ChildProcess } from "node:child_process"
import { mkdir, mkdtemp } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { createWebView2Environment, removeTemporaryRoot, waitForCdpEndpoint } from "./native-process"

type NativeFixtures = {
  tauriApp: Readonly<{ page: Page; processId: number; configDirectory: string; binary: string; startupMs: number }>
  tauriPage: Page
}

const defaultBinary = fileURLToPath(new URL("../../src-tauri/target/release/matriz-control.exe", import.meta.url))

export const test = base.extend<NativeFixtures>({
  tauriApp: async ({}, use) => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-playwright-"))
    const profileDirectory = join(root, "webview2")
    const configDirectory = join(root, "config")
    await Promise.all([mkdir(profileDirectory), mkdir(configDirectory)])
    const cdpPort = await reserveLoopbackPort()
    const binary = process.env.MATRIZ_CONTROL_BINARY ?? defaultBinary
    const startedAt = Date.now()
    const child = spawn(binary, [], {
      env: createWebView2Environment({
        baseEnvironment: process.env,
        cdpPort,
        profileDirectory,
        configDirectory,
      }),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    let nativeOutput = ""
    child.stdout?.on("data", (chunk: Buffer) => { nativeOutput = boundedOutput(nativeOutput, chunk.toString()) })
    child.stderr?.on("data", (chunk: Buffer) => { nativeOutput = boundedOutput(nativeOutput, chunk.toString()) })

    let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined
    try {
      const endpoint = await Promise.race([
        waitForCdpEndpoint({ cdpPort }),
        exited(child).then((code) => { throw new Error(`Matriz Control exited before CDP was ready (${code}).\n${nativeOutput}`) }),
      ])
      browser = await chromium.connectOverCDP(endpoint)
      const context = browser.contexts()[0]
      if (!context) throw new Error("Matriz Control did not expose a WebView2 context")
      const page = context.pages()[0] ?? await context.waitForEvent("page")
      await page.waitForLoadState("domcontentloaded")
      await waitForTauriBridge(page)
      if (!child.pid) throw new Error("Matriz Control did not expose its process ID")
      await use({ page, processId: child.pid, configDirectory, binary, startupMs: Date.now() - startedAt })
    } finally {
      await browser?.close().catch(() => undefined)
      await stopOwnedProcess(child)
      await removeTemporaryRoot({ root })
    }
  },
  tauriPage: async ({ tauriApp }, use) => use(tauriApp.page),
})

export { expect }

async function reserveLoopbackPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolveReady, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolveReady)
  })
  const address = server.address()
  await new Promise<void>((resolveClosed, reject) => server.close((error) => error ? reject(error) : resolveClosed()))
  if (!address || typeof address === "string") throw new Error("Could not reserve a loopback CDP port")
  return address.port
}

function exited(child: ChildProcess): Promise<number | null> {
  return new Promise((resolveExit, reject) => {
    child.once("error", reject)
    child.once("exit", resolveExit)
  })
}

async function stopOwnedProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill()
  const stopped = await Promise.race([
    exited(child).then(() => true),
    new Promise<false>((resolveTimeout) => setTimeout(() => resolveTimeout(false), 5_000)),
  ])
  if (stopped || !child.pid) return
  const terminator = spawn("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], { shell: false, stdio: "ignore", windowsHide: true })
  await exited(terminator)
}

function boundedOutput(current: string, next: string): string {
  return `${current}${next}`.slice(-16_384)
}

export async function waitForTauriBridge(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean((window as unknown as {
    __TAURI_INTERNALS__?: { invoke?: unknown }
  }).__TAURI_INTERNALS__?.invoke))
}
