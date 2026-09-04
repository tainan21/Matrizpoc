import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { Page } from "@playwright/test"

import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"
import { removeTemporaryRoot } from "../playwright/native-process"

async function openNativeAdmin(page: Page): Promise<void> {
  await chooseMode(page, "Apps")
  await page.getByRole("button", { name: "Matriz Admin Nativo", exact: true }).click()
}

test("builds, installs, starts, and stops the canonical native app", async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
  await openNativeAdmin(page)
  const build = page.getByRole("button", { name: "Gerar Matriz Admin nativo", exact: true })
  if (await build.count()) {
    await build.click()
    await chooseMode(page, "Terminal")
    await expect.poll(async () => {
      const label = await page.locator(".terminal-tabs [role='tab']").first().getAttribute("aria-label") ?? ""
      if (label.includes("falhou")) {
        const output = await page.locator(".xterm-rows").innerText()
        throw new Error(`Matriz Admin package failed: ${output}`)
      }
      return label.includes("concluído")
    }, { timeout: 600_000, intervals: [1_000] }).toBe(true)
    await page.getByRole("button", { name: "Fechar MATRIZ ADMIN / BUILD", exact: true }).click()
    await openNativeAdmin(page)
  }

  const install = page.getByRole("button", { name: "Instalar Matriz Admin nativo", exact: true })
  if (await install.count()) {
    await install.click()
    await expect(page.getByRole("button", { name: "Abrir Matriz Admin nativo", exact: true })).toBeVisible({ timeout: 120_000 })
  }

  const open = page.getByRole("button", { name: "Abrir Matriz Admin nativo", exact: true })
  const close = page.getByRole("button", { name: "Fechar Matriz Admin nativo", exact: true })
  if (await close.count()) {
    await close.click()
    await expect(open).toBeVisible({ timeout: 30_000 })
  }

  await open.click()
  try {
    await expect(close).toBeVisible({ timeout: 30_000 })
    await expect(page.locator(".runtime-context small")).toHaveText("RUNNING")
  } finally {
    if (await close.count()) await close.click()
  }
  await expect(open).toBeVisible({ timeout: 30_000 })
  await expect(page.locator(".runtime-context small")).toHaveText("INSTALLED")
})

test("rejects missing and tampered native installers before execution", async ({ tauriPage: page }) => {
  const root = await mkdtemp(join(tmpdir(), "matriz-native-trust-"))
  const installer = join(root, "apps", "matriz-admin", "desktop", "src-tauri", "target", "release", "bundle", "nsis", "Matriz Admin_0.1.0_x64-setup.exe")
  try {
    await Promise.all([
      writeFile(join(root, "package.json"), "{}"),
      writeFile(join(root, "pnpm-workspace.yaml"), "packages: []"),
    ])
    await invoke(page, "select_workspace", { path: root })
    await expect(invoke(page, "install_native_app")).rejects.toThrow(/unavailable|installer/i)

    await mkdir(dirname(installer), { recursive: true })
    await writeFile(installer, "tampered fixture that must never execute")
    await writeFile(`${installer}.sha256`, "0".repeat(64))
    await expect(invoke(page, "install_native_app")).rejects.toThrow(/integrity|verification/i)
  } finally {
    await removeTemporaryRoot({ root })
  }
})

test("starts only the cataloged native build operation and releases it", async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
  const session = await invoke<{ id: string; kind: string; operationId: string; status: string }>(page, "start_managed_operation", { operationId: "app.matriz-admin.native.build" })
  expect(session).toMatchObject({ kind: "managed", operationId: "app.matriz-admin.native.build", status: "running" })
  expect(await invoke<{ id: string }[]>(page, "list_terminals")).toContainEqual(expect.objectContaining({ id: session.id }))
  await invoke(page, "interrupt_terminal", { sessionId: session.id })
  await invoke(page, "close_terminal", { sessionId: session.id })
  expect(await invoke<unknown[]>(page, "list_terminals")).toHaveLength(0)
})

function invoke<T>(page: Page, command: string, args?: Record<string, unknown>): Promise<T> {
  return page.evaluate(({ command, args }) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(name: string, input?: Record<string, unknown>): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(command, args), { command, args })
}
