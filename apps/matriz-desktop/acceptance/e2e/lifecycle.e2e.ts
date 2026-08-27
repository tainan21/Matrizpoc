import { expect } from "@wdio/globals"

describe("Matriz Control installed lifecycle", () => {
  it("exits through the product command instead of process termination", async () => {
    await $("nav[aria-label='Modos'] button[aria-label='Ajustes']").click()
    const quit = $("button=SAIR DO CONTROL")
    await expect(quit).toBeClickable()
    await browser.execute(() => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (item) => item.textContent?.trim() === "SAIR DO CONTROL",
      )
      if (!(button instanceof HTMLButtonElement)) throw new Error("Quit control not found")
      button.click()
    })
  })
})
