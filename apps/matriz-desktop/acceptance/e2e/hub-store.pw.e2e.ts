import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

test("uses the real native Hub services without destructive actions", async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
  await chooseMode(page, "Apps")
  await chooseMode(page, "Hub")

  const pulse = page.locator(".hub-pulse")
  await expect(pulse).toBeVisible()
  await expect(pulse.locator(".pulse-item").filter({ hasText: "CPU" }).locator("strong")).not.toHaveText("—")
  await expect(pulse.locator(".pulse-item").filter({ hasText: "RAM" }).locator("strong")).toContainText("/")
  await expect(pulse.locator(".pulse-item").filter({ hasText: "TEMP" }).locator("strong")).toHaveText(/Unavailable|\d+°C/)

  const awake = page.getByRole("checkbox", { name: "Keep PC Awake" })
  await expect(awake).not.toBeChecked()
  await awake.check()
  await expect(awake).toBeChecked()
  await expect(page.locator(".awake-card")).toContainText("AWAKE: ON")
  await awake.uncheck()
  await expect(awake).not.toBeChecked()
  await expect(page.locator(".awake-card")).toContainText("AWAKE: OFF")

  await page.getByRole("button", { name: "VERIFICAR AGORA" }).click()
  await expect(page.locator(".node-sweep .sweep-summary")).not.toContainText("Aguardando verificação", { timeout: 60_000 })
  await expect(page.getByRole("button", { name: "LIMPAR SELECIONADOS" })).toBeDisabled()

  await expect(page.locator(".resume-card")).toContainText("apps")
  await page.getByRole("button", { name: "RETOMAR" }).click()
  await expect(page.getByRole("heading", { name: "APPS" })).toBeVisible()
  await expect(page.locator(".terminal-tab")).toHaveCount(0)
})

for (const utility of [
  { name: "Node Sweep", selector: ".node-sweep" },
  { name: "System Pulse", selector: ".hub-pulse" },
  { name: "Matriz Awake", selector: ".awake-card" },
  { name: "Resume Session", selector: ".resume-card" },
] as const) {
  test(`opens and focuses the built-in ${utility.name} from Store`, async ({ tauriPage: page }) => {
    await selectAcceptanceWorkspace(page)
    await chooseMode(page, "Store")
    await page.getByRole("textbox", { name: "Buscar na Store" }).fill(utility.name)
    await page.getByRole("button", { name: `Abrir ${utility.name}` }).click()

    await expect(page.getByRole("heading", { name: "MATRIZ HUB" })).toBeVisible()
    const feature = page.locator(utility.selector)
    await expect(feature).toBeVisible()
    await expect(feature).toBeFocused()
  })
}
