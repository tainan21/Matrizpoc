import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import type { Page } from "@playwright/test"

import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

const runId = process.env.MATRIZ_ACCEPTANCE_RUN_ID ?? "current"
const outputRoot = fileURLToPath(new URL(`../../../../output/matriz-control-acceptance/${runId}`, import.meta.url))

const viewports = [
  { id: "compact", width: 420, height: 560 },
  { id: "standard", width: 760, height: 700 },
  { id: "wide", width: 1440, height: 900 },
] as const

const views = ["Início", "Portas", "Apps", "Workspace", "Hub", "Agentes", "Ambientes", "Infra", "Git", "Terminal", "Ações", "Store", "Doctor", "Ajustes"] as const

type VisualResult = {
  viewport: string
  view: string
  clientWidth: number
  scrollWidth: number
  unnamedControls: number
  focusVisible: boolean
  screenshot: string
}

async function inspectSurface(page: Page): Promise<Omit<VisualResult, "viewport" | "view" | "screenshot">> {
  return page.evaluate(() => {
    const root = document.documentElement
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"))
    const controls = candidates.filter((element) => {
      const style = getComputedStyle(element)
      return style.display !== "none" && style.visibility !== "hidden"
    })
    const unnamedControls = controls.filter((element) => {
      const labelledBy = element.getAttribute("aria-labelledby")
      const labelled = labelledBy?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") ?? ""
      const label = element instanceof HTMLInputElement && element.labels
        ? Array.from(element.labels).map((item) => item.textContent ?? "").join(" ")
        : ""
      return ![element.getAttribute("aria-label"), labelled, label, element.getAttribute("title"), element.textContent].some((value) => value?.trim())
    }).length
    return { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, unnamedControls, focusVisible: false }
  })
}

async function proveKeyboardFocus(page: Page): Promise<boolean> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    document.body.focus()
  })
  await page.keyboard.press("Tab")
  return page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement) || active === document.body) return false
    const style = getComputedStyle(active)
    const rect = active.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
  })
}

test("keeps every primary surface usable across supported window sizes", async ({ tauriPage: page }) => {
  const results: VisualResult[] = []
  const screenshotRoot = `${outputRoot}/screenshots`
  await mkdir(screenshotRoot, { recursive: true })
  await chooseMode(page, "Ajustes")
  await page.getByRole("button", { name: "Matriz", exact: true }).click()
  await expect(page.locator(".control-shell")).toHaveAttribute("data-theme", "matriz")

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const view of views) {
      await chooseMode(page, view)
      const destination = page.getByRole("button", { name: new RegExp(`^${view}`) })
      await expect(destination).toHaveAttribute("aria-current", "page")
      if (view === "Início") {
        await expect(page.locator(".home-status-strip")).not.toContainText("Verificando…", { timeout: 20_000 })
      }
      const inspection = await inspectSurface(page)
      const focusVisible = await proveKeyboardFocus(page)
      const directory = `${screenshotRoot}/${viewport.id}`
      await mkdir(directory, { recursive: true })
      const screenshot = `${directory}/${view.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`
      await page.screenshot({ path: screenshot })

      expect(inspection.scrollWidth).toBeLessThanOrEqual(inspection.clientWidth)
      expect(inspection.unnamedControls).toBe(0)
      expect(focusVisible).toBe(true)
      results.push({ ...inspection, focusVisible, viewport: viewport.id, view, screenshot })
    }
  }

  await writeFile(`${outputRoot}/visual.json`, JSON.stringify({ schemaVersion: "v1", capturedAt: new Date().toISOString(), results }, null, 2), "utf8")
})

test("keeps motion restrained and the terminal operable", async ({ tauriPage: page }) => {
  await page.setViewportSize({ width: 420, height: 560 })
  await chooseMode(page, "Terminal")
  const create = page.getByRole("button", { name: "Nova sessão PowerShell", exact: true })
  await expect(create).toBeEnabled()
  await create.click()
  await expect(page.locator("[role='tab'][aria-selected='true']")).toBeVisible()
  await expect(page.locator("[role='tabpanel']")).toBeVisible()

  const motion = await page.locator(".terminal-tab").evaluate((probe) => {
    const style = getComputedStyle(probe)
    const toMilliseconds = (value: string) => value.trim().endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
    return {
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      maximumAnimationMs: Math.max(0, ...style.animationDuration.split(",").map(toMilliseconds)),
      maximumTransitionMs: Math.max(0, ...style.transitionDuration.split(",").map(toMilliseconds)),
    }
  })
  expect(motion.maximumAnimationMs).toBe(0)
  expect(motion.maximumTransitionMs).toBeLessThanOrEqual(motion.reduced ? 1 : 100)

  await page.getByRole("button", { name: /^Fechar PowerShell/ }).click()
  await expect(page.locator("[role='tab']")).toHaveCount(0)
})
