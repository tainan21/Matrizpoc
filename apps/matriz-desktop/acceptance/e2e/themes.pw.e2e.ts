import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

const runId = process.env.MATRIZ_ACCEPTANCE_RUN_ID ?? "current"
const screenshotRoot = fileURLToPath(new URL(`../../../../output/matriz-control-acceptance/${runId}/themes`, import.meta.url))
const themes = [
  ["Matriz", "matriz"],
  ["Reator Ácido", "reactor-acid"],
  ["Aurora Líquida", "aurora-liquid"],
  ["Brasa Industrial", "industrial-ember"],
] as const

test("applies and restores every operational theme through native settings", async ({ tauriPage: page }) => {
  await mkdir(screenshotRoot, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await chooseMode(page, "Ajustes")
  const observedAccents = new Set<string>()

  for (const [label, id] of themes) {
    await page.getByRole("button", { name: label, exact: true }).click()
    await expect(page.locator(".control-shell")).toHaveAttribute("data-theme", id)
    await expect(page.locator("html")).toHaveAttribute("data-theme", id)
    observedAccents.add(await page.locator(".control-shell").evaluate((element) => getComputedStyle(element).getPropertyValue("--matriz-color-action").trim()))
    await page.screenshot({ path: `${screenshotRoot}/${id}.png` })
  }

  expect(observedAccents.size).toBe(themes.length)
  await page.waitForTimeout(150)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "industrial-ember")
  await expect(page.locator(".control-shell")).toHaveAttribute("data-theme", "industrial-ember")
})
