import { expect } from "@wdio/globals"
import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url))

async function chooseMode(label: string): Promise<void> {
  await $(`nav[aria-label='Modos'] button[aria-label^='${label}']`).click()
}

async function selectAcceptanceWorkspace(): Promise<void> {
  await chooseMode("Ajustes")
  const workspace = $("input[aria-label='Workspace']")
  await workspace.setValue(workspaceRoot)
  await $("button=USAR").click()
  await expect($("footer [role='status']")).toHaveText("Workspace pronto")
}

async function openNativeAdmin(): Promise<void> {
  await chooseMode("Apps")
  await $("button[aria-label='Matriz Admin Nativo']").click()
}

describe("Matriz Admin native lifecycle", () => {
  before(selectAcceptanceWorkspace)

  it("builds, installs, starts, and stops the canonical native app", async () => {
    await openNativeAdmin()
    const build = $("button[aria-label='Gerar Matriz Admin nativo']")
    if (await build.isExisting()) {
      await build.click()
      await chooseMode("Terminal")
      await browser.waitUntil(
        async () => {
          const label = (await $(".terminal-tabs [role='tab']").getAttribute("aria-label")) ?? ""
          if (label.includes("falhou")) {
            const output = await $(".xterm-rows").getText()
            throw new Error(`Matriz Admin package failed: ${output}`)
          }
          return label.includes("concluído")
        },
        { timeout: 600_000, interval: 1_000 },
      )
      await $("button[aria-label='Fechar MATRIZ ADMIN / BUILD']").click()
      await openNativeAdmin()
    }

    const install = $("button[aria-label='Instalar Matriz Admin nativo']")
    if (await install.isExisting()) {
      await install.click()
      await $("button[aria-label='Abrir Matriz Admin nativo']").waitForDisplayed({ timeout: 120_000 })
    }

    const close = $("button[aria-label='Fechar Matriz Admin nativo']")
    if (await close.isExisting()) {
      await close.click()
      await $("button[aria-label='Abrir Matriz Admin nativo']").waitForDisplayed({ timeout: 30_000 })
    }

    await $("button[aria-label='Abrir Matriz Admin nativo']").click()
    await $("button[aria-label='Fechar Matriz Admin nativo']").waitForDisplayed({ timeout: 30_000 })
    await expect($(".app-tile--seumei small")).toHaveText("RUNNING")

    await $("button[aria-label='Fechar Matriz Admin nativo']").click()
    await $("button[aria-label='Abrir Matriz Admin nativo']").waitForDisplayed({ timeout: 30_000 })
    await expect($(".app-tile--seumei small")).toHaveText("INSTALLED")
  })
})
