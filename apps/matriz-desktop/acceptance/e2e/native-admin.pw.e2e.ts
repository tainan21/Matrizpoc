import type { Page } from "@playwright/test"

import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

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
