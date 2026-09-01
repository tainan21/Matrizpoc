import { expect, type Page } from "@playwright/test"
import { fileURLToPath } from "node:url"

export const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url))

export async function chooseMode(page: Page, label: string): Promise<void> {
  await page.locator("nav[aria-label='Modos']").getByRole("button", { name: new RegExp(`^${label}`) }).click()
}

export async function selectAcceptanceWorkspace(page: Page): Promise<void> {
  await chooseMode(page, "Ajustes")
  const workspace = page.getByRole("textbox", { name: "Workspace" })
  await expect(workspace).toBeVisible()
  await workspace.fill(workspaceRoot)
  await page.getByRole("button", { name: "USAR", exact: true }).click()
  await expect(page.locator("footer [role='status']")).toHaveText("Workspace pronto")
}
