import { spawn, type ChildProcess } from "node:child_process"
import { createServer, type Server } from "node:net"
import { once } from "node:events"
import { fileURLToPath } from "node:url"
import type { Page } from "@playwright/test"
import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

type Snapshot = Readonly<{ snapshotId: string; ports: readonly { port: number; pid: number; processName: string }[] }>

test("observes and terminates only harness-owned listener snapshots", async ({ tauriPage: page }) => {
  const first = await listenerProcess()
  const second = await listenerProcess()
  const protectedServer = createServer()
  await new Promise<void>((resolve, reject) => {
    protectedServer.once("error", reject)
    protectedServer.listen(0, "127.0.0.1", resolve)
  })
  try {
    await chooseMode(page, "Portas")
    await refresh(page)
    const observed = await snapshot(page)
    for (const listener of [first, second]) {
      expect(observed.ports).toContainEqual(expect.objectContaining({ pid: listener.child.pid, port: listener.port, processName: expect.any(String) }))
    }

    const search = page.getByLabel("Buscar portas")
    await search.fill(String(first.port))
    await expect(page.locator(".port-row")).toHaveCount(1)
    await expect(page.locator(".port-row")).toContainText(String(first.child.pid))
    await search.fill("")

    const stale = observed.snapshotId
    const current = await snapshot(page)
    await expect(invoke(page, "terminate_process", { request: { pid: first.child.pid, snapshotId: stale } })).rejects.toThrow(/refresh|snapshot|stale/i)
    expect(first.child.exitCode).toBeNull()

    const protectedPort = (protectedServer.address() as { port: number }).port
    expect(current.ports).toContainEqual(expect.objectContaining({ pid: process.pid, port: protectedPort }))
    await expect(invoke(page, "terminate_process", { request: { pid: process.pid, snapshotId: current.snapshotId } })).rejects.toThrow(/protected|refused|ancestor|system/i)
    expect(protectedServer.listening).toBe(true)

    await refresh(page)
    await page.keyboard.press("Control+K")
    const deckOption = page.locator(".command-deck").getByRole("option").filter({ hasText: `PID ${first.child.pid}` })
    await expect(deckOption).toHaveCount(1)
    await deckOption.click()
    expect(first.child.exitCode).toBeNull()
    await expect(page.getByText("ENTER NOVAMENTE")).toBeVisible()
    await deckOption.click()
    await waitForExit(first.child)

    const finalSnapshot = await snapshot(page)
    await invoke(page, "terminate_processes", { request: { pids: [second.child.pid], snapshotId: finalSnapshot.snapshotId } })
    await waitForExit(second.child)
    await expect.poll(async () => (await snapshot(page)).ports.some(({ pid }) => pid === first.child.pid || pid === second.child.pid)).toBe(false)
  } finally {
    protectedServer.close()
    await Promise.all([stop(first.child), stop(second.child)])
  }
})

test("reports access denial without requesting elevation", async ({ tauriPage: page }) => {
  const fixture = await accessDeniedListenerProcess()
  try {
    await chooseMode(page, "Portas")
    await refresh(page)
    const current = await snapshot(page)
    expect(current.ports).toContainEqual(expect.objectContaining({ pid: fixture.child.pid, port: fixture.port }))
    await expect(invoke(page, "terminate_process", { request: { pid: fixture.child.pid, snapshotId: current.snapshotId } })).rejects.toThrow(/access denied.*will not request elevation.*owning app/i)
    expect(fixture.child.exitCode).toBeNull()
  } finally {
    fixture.child.stdin?.write("stop\n")
    await waitForExit(fixture.child)
  }
})

async function listenerProcess(): Promise<{ child: ChildProcess; port: number }> {
  const child = spawn(process.execPath, ["-e", "require('net').createServer().listen(0,'127.0.0.1',function(){console.log(this.address().port)})"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
  const [chunk] = await Promise.race([
    once(child.stdout!, "data"),
    once(child, "exit").then(([code]) => { throw new Error(`Listener fixture exited before readiness (${code})`) }),
  ])
  const port = Number.parseInt(String(chunk).replace(/\x1b\[[0-9;]*m/g, "").trim(), 10)
  if (!child.pid || !Number.isInteger(port)) throw new Error(`Listener fixture did not report a PID and port (pid=${child.pid ?? "missing"}, stdout=${JSON.stringify(String(chunk))})`)
  return { child, port }
}

async function accessDeniedListenerProcess(): Promise<{ child: ChildProcess; port: number }> {
  const script = fileURLToPath(new URL("../windows/access-denied-listener.ps1", import.meta.url))
  const child = spawn("pwsh.exe", ["-NoProfile", "-File", script, "-Port", "0"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true })
  const [chunk] = await Promise.race([
    once(child.stdout!, "data"),
    once(child, "exit").then(([code]) => { throw new Error(`Access-denied listener exited before readiness (${code})`) }),
  ])
  const ready = JSON.parse(String(chunk).trim()) as { pid: number; port: number }
  if (!child.pid || ready.pid !== child.pid || !Number.isInteger(ready.port)) throw new Error("Access-denied listener did not report its owned PID and port")
  return { child, port: ready.port }
}

async function refresh(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Atualizar", exact: true }).click()
  await expect(page.locator("footer [role='status']")).toHaveText("Atualizado")
}

function snapshot(page: Page): Promise<Snapshot> {
  return invoke(page, "get_snapshot")
}

function invoke<T>(page: Page, command: string, args?: Record<string, unknown>): Promise<T> {
  return page.evaluate(({ command, args }) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(name: string, input?: Record<string, unknown>): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(command, args), { command, args })
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  await Promise.race([once(child, "exit"), new Promise((_, reject) => setTimeout(() => reject(new Error("Listener fixture did not exit")), 5_000))])
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill()
  await waitForExit(child).catch(() => undefined)
}
