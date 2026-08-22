import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { expect } from "@wdio/globals"

const runId = process.env.MATRIZ_ACCEPTANCE_RUN_ID ?? "current"
const outputRoot = fileURLToPath(
  new URL(`../../../../output/matriz-control-acceptance/${runId}`, import.meta.url),
)

const viewports = [
  { id: "compact", width: 420, height: 560 },
  { id: "standard", width: 760, height: 700 },
  { id: "wide", width: 1440, height: 900 },
] as const

const views = ["Portas", "Apps", "Terminal", "Ações", "Doctor", "Ajustes"] as const

type VisualResult = {
  viewport: string
  view: string
  clientWidth: number
  scrollWidth: number
  unnamedControls: number
  focusVisible: boolean
  screenshot: string
}

async function inspectSurface(): Promise<Omit<VisualResult, "viewport" | "view" | "screenshot">> {
  return browser.execute(() => {
    const root = document.documentElement
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"),
    )
    const controls: HTMLElement[] = []
    for (const element of candidates) {
      const style = getComputedStyle(element)
      if (style.display !== "none" && style.visibility !== "hidden") controls.push(element)
    }
    let unnamedControls = 0
    for (const element of controls) {
      const labelledBy = element.getAttribute("aria-labelledby")
      let labelled = ""
      if (labelledBy) {
        for (const id of labelledBy.split(/\s+/)) labelled += ` ${document.getElementById(id)?.textContent ?? ""}`
      }
      let label = ""
      if (element instanceof HTMLInputElement && element.labels) {
        for (const item of Array.from(element.labels)) label += ` ${item.textContent ?? ""}`
      }
      const values = [element.getAttribute("aria-label"), labelled, label, element.getAttribute("title"), element.textContent]
      let named = false
      for (const value of values) {
        if (value?.trim()) named = true
      }
      if (!named) unnamedControls += 1
    }
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      unnamedControls,
      focusVisible: false,
    }
  })
}

async function proveKeyboardFocus(): Promise<boolean> {
  await browser.execute(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    document.body.focus()
  })
  await browser.keys("Tab")
  return browser.execute(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement) || active === document.body) return false
    const style = getComputedStyle(active)
    const rect = active.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
  })
}

describe("Matriz Control visual and accessibility matrix", () => {
  it("keeps every primary surface usable across supported window sizes", async () => {
    const results: VisualResult[] = []
    const screenshotRoot = `${outputRoot}/screenshots`
    await mkdir(screenshotRoot, { recursive: true })

    for (const viewport of viewports) {
      await browser.setWindowSize(viewport.width, viewport.height)
      for (const view of views) {
        const destination = $(`nav[aria-label='Modos'] button[aria-label^='${view}']`)
        await destination.click()
        await expect(destination).toHaveAttribute("aria-current", "page")
        const inspection = await inspectSurface()
        const focusVisible = await proveKeyboardFocus()
        const directory = `${screenshotRoot}/${viewport.id}`
        await mkdir(directory, { recursive: true })
        const screenshot = `${directory}/${view.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`
        await browser.saveScreenshot(screenshot)

        expect(inspection.scrollWidth).toBeLessThanOrEqual(inspection.clientWidth)
        expect(inspection.unnamedControls).toBe(0)
        expect(focusVisible).toBe(true)
        results.push({ ...inspection, focusVisible, viewport: viewport.id, view, screenshot })
      }
    }

    await writeFile(
      `${outputRoot}/visual.json`,
      JSON.stringify({ schemaVersion: "v1", capturedAt: new Date().toISOString(), results }, null, 2),
      "utf8",
    )
  })

  it("keeps motion restrained and the terminal operable", async () => {
    await browser.setWindowSize(420, 560)
    await $("nav[aria-label='Modos'] button[aria-label='Terminal']").click()
    const create = $("button[aria-label='Nova sessão PowerShell']")
    await expect(create).toBeClickable()
    await create.click()
    const tab = $("[role='tab'][aria-selected='true']")
    await expect(tab).toBeDisplayed()
    await expect($("[role='tabpanel']")).toBeDisplayed()

    const motion = await browser.execute(() => {
      const probe = document.querySelector<HTMLElement>(".terminal-tab")
      if (!probe) throw new Error("Terminal tab not found")
      const style = getComputedStyle(probe)
      const animationValues: number[] = []
      for (const item of style.animationDuration.split(",")) {
        const entry = item.trim()
        animationValues.push(entry.endsWith("ms") ? Number.parseFloat(entry) : Number.parseFloat(entry) * 1000)
      }
      const transitionValues: number[] = []
      for (const item of style.transitionDuration.split(",")) {
        const entry = item.trim()
        transitionValues.push(entry.endsWith("ms") ? Number.parseFloat(entry) : Number.parseFloat(entry) * 1000)
      }
      return {
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        maximumAnimationMs: Math.max(0, ...animationValues),
        maximumTransitionMs: Math.max(0, ...transitionValues),
      }
    })
    expect(motion.maximumAnimationMs).toBe(0)
    expect(motion.maximumTransitionMs).toBeLessThanOrEqual(motion.reduced ? 1 : 100)

    const close = $("button[aria-label^='Fechar PowerShell']")
    await close.click()
    await expect($("[role='tab']")).not.toBeExisting()
  })
})
