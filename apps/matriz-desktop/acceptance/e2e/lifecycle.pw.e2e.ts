import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

test("exits through the product command instead of external process termination", async ({ tauriPage: page }) => {
  await chooseMode(page, "Ajustes")
  const quit = page.getByRole("button", { name: "SAIR DO CONTROL", exact: true })
  await expect(quit).toBeEnabled()
  await Promise.all([
    page.waitForEvent("close"),
    quit.click(),
  ])
})
