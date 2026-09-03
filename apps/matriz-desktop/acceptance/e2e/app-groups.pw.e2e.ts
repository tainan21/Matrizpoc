import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

test("creates an app group and reorders its projects in the native workspace", async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
  await chooseMode(page, "Apps")

  await expect(page.locator(".runtime-row").first()).toContainText("Hub")
  await expect(page.getByRole("button", { name: "Iniciar grupo Matriz", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Parar grupo Matriz", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Mostrar relatório da sequência", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "+ NOVO GRUPO", exact: true }).click()
  await page.getByRole("textbox", { name: "Nome do novo grupo" }).fill("Release")
  await page.getByRole("button", { name: "CRIAR", exact: true }).click()

  const release = page.locator(".desktop-group-tabs").getByRole("button", { name: /Release/ })
  await expect(release).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator(".runtime-row")).toHaveCount(0)

  await page.getByRole("button", { name: "+ ADICIONAR APP", exact: true }).click()
  await page.locator(".desktop-group-picker").getByRole("button", { name: /^Hub/ }).click()
  await page.locator(".desktop-group-picker").getByRole("button", { name: /^Workbench/ }).click()

  const rows = page.locator(".runtime-row")
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText("Hub")
  await expect(rows.nth(1)).toContainText("Workbench")

  const dragged = page.locator(".runtime-row-wrap").nth(1)
  const target = page.locator(".runtime-row-wrap").nth(0)
  await dragged.dispatchEvent("dragstart")
  await target.dispatchEvent("dragover")
  await target.dispatchEvent("drop")
  await expect(rows.nth(0)).toContainText("Workbench")
  await expect(rows.nth(1)).toContainText("Hub")

  await expect(page.getByRole("button", { name: "Iniciar grupo Release", exact: true })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Parar grupo Release", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "Mostrar relatório da sequência", exact: true }).click()
  await expect(page.getByRole("button", { name: "Mostrar relatório da sequência", exact: true })).toHaveAttribute("aria-expanded", "true")
})
