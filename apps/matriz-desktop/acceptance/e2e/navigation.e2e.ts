import { expect } from "@wdio/globals"

const destinations = [
  ["Portas", "main h1", "PORTAS"],
  ["Apps", "main h1", "APPS"],
  ["Terminal", "main section[aria-label='Terminal']", undefined],
  ["Ações", "main h1", "AÇÕES"],
  ["Doctor", "main h1", "DOCTOR"],
  ["Ajustes", "main h1", "AJUSTES"],
] as const

async function setRangeValue(selector: string, value: string): Promise<void> {
  await browser.execute(
    (target, next) => {
      const input = document.querySelector<HTMLInputElement>(target)
      if (!input) throw new Error(`Range not found: ${target}`)
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      setter?.call(input, next)
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    },
    selector,
    value,
  )
}

describe("Matriz Control native shell", () => {
  it("renders the Matriz identity and exposes every primary mode", async () => {
    await expect($("[data-matrizlib='0.1.0']")).toBeExisting()
    await expect($("header strong")).toHaveText("MATRIZ / CONTROL")

    for (const [label] of destinations) {
      await expect($(`nav[aria-label='Modos'] button[aria-label^='${label}']`)).toBeClickable()
    }
  })

  it("navigates through the compact shell without opening another window", async () => {
    for (const [label, contentSelector, contentText] of destinations) {
      const destination = $(`nav[aria-label='Modos'] button[aria-label^='${label}']`)
      await destination.click()
      await expect(destination).toHaveAttribute("aria-current", "page")
      const content = $(contentSelector)
      await expect(content).toBeDisplayed()
      if (contentText) await expect(content).toHaveText(contentText)
    }
  })

  it("opens the command deck with its documented shortcut and restores focus", async () => {
    await expect($("footer kbd")).toHaveText("Ctrl K")
    const origin = $("nav[aria-label='Modos'] button[aria-label='Portas']")
    await origin.click()
    await browser.keys(["Control", "k"])
    const search = $("input[aria-label='Buscar ações']")
    await expect(search).toBeFocused()
    await search.setValue("nova sessão powershell")
    await browser.keys("Escape")
    await expect(origin).toBeFocused()
  })

  it("persists compact settings across navigation", async () => {
    await $("nav[aria-label='Modos'] button[aria-label='Ajustes']").click()
    const sounds = $(".settings-list label:nth-child(1) input")
    const volume = $("input[aria-label='Volume']")
    const originalSounds = await sounds.isSelected()
    const originalVolume = await volume.getValue()

    await sounds.click()
    await setRangeValue("input[aria-label='Volume']", "0.65")
    try {
      await $("nav[aria-label='Modos'] button[aria-label='Portas']").click()
      await $("nav[aria-label='Modos'] button[aria-label='Ajustes']").click()
      expect(await $(".settings-list label:nth-child(1) input").isSelected()).toBe(!originalSounds)
      await expect($("input[aria-label='Volume']")).toHaveValue("0.65")
    } finally {
      const persistedSounds = $(".settings-list label:nth-child(1) input")
      if ((await persistedSounds.isSelected()) !== originalSounds) await persistedSounds.click()
      await setRangeValue("input[aria-label='Volume']", originalVolume)
    }
  })

  it("reports the real workspace, toolchain, and Git pulse", async () => {
    await $("nav[aria-label='Modos'] button[aria-label='Doctor']").click()
    await browser.waitUntil(async () => (await $$(".check-list > div").length) === 4, { timeout: 20_000 })
    const checks = await browser.execute(() =>
      Array.from(document.querySelectorAll(".check-list > div")).map((element) => ({
        text: element.textContent ?? "",
        ready: Boolean(element.querySelector(".status-dot.ready")),
      })),
    )
    expect(checks).toHaveLength(4)
    if (!checks.every((check) => check.ready)) {
      throw new Error(`Doctor degraded: ${JSON.stringify(checks)}`)
    }
    expect(checks.map((check) => check.text).join(" ")).not.toMatch(/failed|timed out/i)

    await $("nav[aria-label='Modos'] button[aria-label='Ações']").click()
    await expect($("main .section-head")).toHaveText(expect.stringContaining("codex/matriz-desktop"))
  })
})
