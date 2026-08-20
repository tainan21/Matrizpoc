import { expect } from "@wdio/globals"

const destinations = [
  ["Portas", "main h1", "PORTAS"],
  ["Apps", "main h1", "APPS"],
  ["Terminal", "main section[aria-label='Terminal']", undefined],
  ["Ações", "main h1", "AÇÕES"],
  ["Doctor", "main h1", "DOCTOR"],
  ["Ajustes", "main h1", "AJUSTES"],
] as const

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
})
