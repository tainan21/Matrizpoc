import type { Page } from "@playwright/test"

import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

const apps = [
  { label: "Hub", actionLabel: "Matriz Hub", terminal: "MATRIZ-HUB / WEB" },
  { label: "Spot", actionLabel: "Spot", terminal: "SPOT / WEB" },
  { label: "Matriz Admin", actionLabel: "Matriz Admin", terminal: "MATRIZ-ADMIN / WEB" },
  { label: "Contracts", actionLabel: "Contracts", terminal: "CONTRACTS / WEB" },
  { label: "Willdash", actionLabel: "Willdash", terminal: "WILLDASH / WEB" },
  { label: "Workbench", actionLabel: "Workbench", terminal: "MATRIZ-WORKBENCH / WEB" },
  { label: "Sites", actionLabel: "Sites", terminal: "SITES / WEB" },
  { label: "MatrizLib", actionLabel: "MatrizLib", terminal: "MATRIZLIB / WEB" },
  { label: "Seumei", actionLabel: "Seumei", terminal: "SEUMEI / WEB" },
] as const

test("maps every canonical Matriz app to its fixed listener port", async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
  await chooseMode(page, "Apps")
  for (const [index, app] of apps.entries()) {
    const row = page.locator(".runtime-row").filter({ hasText: app.label })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(`:${3000 + index}`)
  }
})

async function terminalLabels(page: Page): Promise<readonly string[]> {
  return page.locator(".terminal-tabs [role='tab']").evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute("aria-label") ?? ""))
}

async function startAndStop(page: Page, label: string, actionLabel: string, terminal: string): Promise<boolean> {
  await chooseMode(page, "Apps")
  const row = page.locator(".runtime-row").filter({ hasText: label })
  await row.click()
  if ((await row.locator("small").innerText()).includes("EXTERNO")) return false
  const start = page.getByRole("button", { name: `Iniciar ${actionLabel}`, exact: true })
  await start.scrollIntoViewIfNeeded()
  await expect(start).toBeVisible()
  await start.click()

  const stop = page.getByRole("button", { name: `Parar ${actionLabel}`, exact: true })
  try {
    await expect(stop).toBeVisible({ timeout: 60_000 })
  } catch {
    await chooseMode(page, "Terminal")
    const output = await page.locator(".xterm-rows").innerText().catch(() => "<sem saída>")
    throw new Error(`${label} did not become ready; terminal=${output}`)
  }

  await chooseMode(page, "Terminal")
  expect((await terminalLabels(page)).filter((item) => item.startsWith(terminal))).toHaveLength(1)

  await chooseMode(page, "Apps")
  await stop.click()
  await expect(start).toBeVisible({ timeout: 20_000 })

  await chooseMode(page, "Terminal")
  await expect.poll(async () => (await terminalLabels(page)).some((item) => item.startsWith(terminal))).toBe(false)
  return true
}

for (const app of apps) {
  test(`starts, owns, stops, and restarts ${app.label}`, async ({ tauriPage: page }) => {
    await selectAcceptanceWorkspace(page)
    if (!await startAndStop(page, app.label, app.actionLabel, app.terminal)) test.skip(true, `${app.label} is externally owned and its managed lifecycle was not exercised`)
    expect(await startAndStop(page, app.label, app.actionLabel, app.terminal)).toBe(true)
  })
}
