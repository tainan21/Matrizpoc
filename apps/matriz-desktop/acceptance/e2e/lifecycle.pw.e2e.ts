import { execFile } from "node:child_process"
import { readFile, readdir } from "node:fs/promises"
import { promisify } from "node:util"

import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

const execFileAsync = promisify(execFile)

test("exits through the product command instead of external process termination", async ({ tauriApp }) => {
  const { page, processId, binary, startupMs } = tauriApp
  expect(startupMs).toBeLessThan(15_000)
  expect(page.context().pages()).toHaveLength(1)
  await expect(page.getByRole("button", { name: "Início", exact: true })).toBeEnabled()
  expect(await exactProcessIds(binary)).toEqual([processId])
  await chooseMode(page, "Ajustes")
  const quit = page.getByRole("button", { name: "SAIR DO CONTROL", exact: true })
  await expect(quit).toBeEnabled()
  await Promise.all([
    page.waitForEvent("close"),
    quit.click(),
  ])
})

test("exits without orphaning terminal children or persisting terminal output", async ({ tauriApp }) => {
  const { page, processId, configDirectory } = tauriApp
  const marker = `MATRIZ_PRIVATE_TERMINAL_${Date.now()}`
  await selectAcceptanceWorkspace(page)
  await chooseMode(page, "Terminal")
  await page.getByRole("button", { name: "Nova sessão PowerShell" }).click()
  await expect(page.locator("[role='tab'][aria-label*='executando']")).toBeVisible()
  await page.locator(".xterm-screen").click()
  await page.keyboard.type(`Write-Output '${marker}'`)
  await page.keyboard.press("Enter")
  await expect(page.locator(".xterm-rows")).toContainText(marker)

  const shellProcessId = await expect.poll(() => findPowerShellDescendant(processId), { timeout: 10_000 }).not.toBeNull().then(() => findPowerShellDescendant(processId))
  expect(shellProcessId).not.toBeNull()

  await chooseMode(page, "Ajustes")
  await Promise.all([
    page.waitForEvent("close"),
    page.getByRole("button", { name: "SAIR DO CONTROL", exact: true }).click(),
  ])
  await expect.poll(() => processExists(shellProcessId!), { timeout: 10_000 }).toBe(false)
  expect(await persistedFilesContain(configDirectory, marker)).toBe(false)
})

test("closes the main window to tray without terminating Control", async ({ tauriApp }) => {
  const { page, processId } = tauriApp
  await expect(page.getByRole("button", { name: "Início", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "Ocultar", exact: true }).click()
  await page.waitForTimeout(500)
  expect(await processExists(processId)).toBe(true)
  await expect(page.getByRole("button", { name: "Hub", exact: true })).toBeEnabled()
})

async function findPowerShellDescendant(rootPid: number): Promise<number | null> {
  const script = "$p=Get-CimInstance Win32_Process|Select-Object ProcessId,ParentProcessId,Name;$p|ConvertTo-Json -Compress"
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true })
  const parsed = JSON.parse(stdout || "[]") as { ProcessId: number; ParentProcessId: number; Name: string } | { ProcessId: number; ParentProcessId: number; Name: string }[]
  const processes = Array.isArray(parsed) ? parsed : [parsed]
  const descendants = new Set([rootPid])
  for (let pass = 0; pass < processes.length; pass += 1) {
    for (const process of processes) if (descendants.has(process.ParentProcessId)) descendants.add(process.ProcessId)
  }
  return processes.find((process) => descendants.has(process.ProcessId) && /^(pwsh|powershell)\.exe$/i.test(process.Name))?.ProcessId ?? null
}

async function exactProcessIds(binary: string): Promise<number[]> {
  const escaped = binary.replace(/'/g, "''")
  const script = `@(Get-CimInstance Win32_Process -Filter "Name = 'matriz-control.exe'" | Where-Object { $_.ExecutablePath -eq '${escaped}' } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress`
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true })
  const parsed = JSON.parse(stdout || "[]") as number | number[]
  return (Array.isArray(parsed) ? parsed : [parsed]).sort((left, right) => left - right)
}

async function processExists(pid: number): Promise<boolean> {
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `if (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { 'yes' }`], { windowsHide: true })
  return stdout.trim() === "yes"
}

async function persistedFilesContain(directory: string, marker: string): Promise<boolean> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}\\${entry.name}`
    if (entry.isDirectory()) {
      if (await persistedFilesContain(path, marker)) return true
    } else if ((await readFile(path)).includes(Buffer.from(marker))) return true
  }
  return false
}
