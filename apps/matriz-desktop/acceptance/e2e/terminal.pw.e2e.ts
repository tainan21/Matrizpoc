import type { Page } from "@playwright/test"

import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

const terminalOutput = (page: Page) => page.locator(".xterm-rows")
const terminalSurface = (page: Page) => page.locator(".xterm-screen")

async function openTerminal(page: Page): Promise<void> {
  await chooseMode(page, "Terminal")
  await expect(page.locator("main section[aria-label='Terminal']")).toBeVisible()
}

async function createShell(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Nova sessão PowerShell" }).click()
  const running = page.locator("[role='tab'][aria-label*='executando']")
  try {
    await expect(running.last()).toBeVisible({ timeout: 10_000 })
  } catch {
    const operationalMessage = await page.locator("footer [role='status']").innerText()
    throw new Error(`PowerShell session was not created: ${operationalMessage}`)
  }
  await expect(terminalSurface(page)).toBeVisible()
  await terminalSurface(page).click()
}

async function closeEveryShell(page: Page): Promise<void> {
  const tabs = page.locator(".terminal-tabs [role='tab']")
  while (await tabs.count()) {
    const before = await tabs.count()
    await page.getByRole("button", { name: /^Fechar PowerShell/ }).click()
    try {
      await expect(tabs).toHaveCount(before - 1)
    } catch {
      const labels = await tabs.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label") ?? "<missing>"))
      const operationalMessage = await page.locator("footer [role='status']").innerText()
      throw new Error(`Terminal close did not release a session: before=${before}; tabs=${labels.join(" | ")}; status=${operationalMessage}`)
    }
  }
}

test.beforeEach(async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
})

test.afterEach(async ({ tauriPage: page }) => {
  await openTerminal(page)
  await closeEveryShell(page)
})

test("streams cwd and Unicode output, then remains interactive after Ctrl+C", async ({ tauriPage: page }) => {
  const marker = `MATRIZ_ACCEPTANCE_${Date.now()}`
  await openTerminal(page)
  await createShell(page)

  await expect(page.locator(":focus")).toHaveClass(/xterm-helper-textarea/)
  await page.keyboard.type(`Write-Output '${marker}'; Get-Location; $u=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('YcOnw6NvX+Kckw==')); Write-Output $u`)
  await page.keyboard.press("Enter")
  try {
    await expect(terminalOutput(page)).toContainText(marker, { timeout: 10_000 })
  } catch {
    const output = await terminalOutput(page).innerText()
    const tab = await page.locator(".terminal-tabs [role='tab']").getAttribute("aria-label")
    throw new Error(`PowerShell marker did not reach xterm; tab=${tab}; output=${output}`)
  }
  await expect(terminalOutput(page)).toContainText("ação_✓")
  await expect(terminalOutput(page)).toContainText("matriz-infra-hub")

  await page.keyboard.type("while ($true) { Start-Sleep -Milliseconds 200 }")
  await page.keyboard.press("Enter")
  await page.getByRole("button", { name: /^Interromper PowerShell/ }).click()
  await terminalSurface(page).click()
  await page.keyboard.type("Write-Output 'INTERRUPT_OK'")
  await page.keyboard.press("Enter")
  await expect(terminalOutput(page)).toContainText("INTERRUPT_OK")
})

test("enforces six tabs and releases every session through visible controls", async ({ tauriPage: page }) => {
  await openTerminal(page)
  for (let index = 0; index < 6; index += 1) await createShell(page)

  await expect(page.getByRole("button", { name: "Nova sessão PowerShell" })).toBeDisabled()
  await expect(page.locator(".terminal-tabs [role='tab']")).toHaveCount(6)

  await closeEveryShell(page)
  await expect(page.locator(".terminal-tabs [role='tab']")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Nova sessão PowerShell" })).toBeEnabled()
})
