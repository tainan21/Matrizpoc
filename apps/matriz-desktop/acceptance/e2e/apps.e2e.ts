import { expect } from "@wdio/globals"
import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url))

const apps = [
  { label: "Hub", terminal: "MATRIZ-HUB / WEB" },
  { label: "Spot", terminal: "SPOT / WEB" },
  { label: "Matriz Admin", terminal: "MATRIZ-ADMIN / WEB" },
  { label: "Contracts", terminal: "CONTRACTS / WEB" },
  { label: "Willdash", terminal: "WILLDASH / WEB" },
  { label: "Workbench", terminal: "MATRIZ-WORKBENCH / WEB" },
  { label: "Sites", terminal: "SITES / WEB" },
  { label: "MatrizLib", terminal: "MATRIZLIB / WEB" },
  { label: "Seumei", terminal: "SEUMEI / WEB" },
] as const

async function chooseMode(label: string): Promise<void> {
  await $(`nav[aria-label='Modos'] button[aria-label^='${label}']`).click()
}

async function selectAcceptanceWorkspace(): Promise<void> {
  await chooseMode("Ajustes")
  const workspace = $("input[aria-label='Workspace']")
  await expect(workspace).toBeDisplayed()
  await workspace.setValue(workspaceRoot)
  await $("button=USAR").click()
  await expect($("footer [role='status']")).toHaveText("Workspace pronto")
}

async function terminalLabels(): Promise<readonly string[]> {
  return browser.execute(() =>
    Array.from(document.querySelectorAll(".terminal-tabs [role='tab']")).map(
      (element) => element.getAttribute("aria-label") ?? "",
    ),
  )
}

async function startAndStop(label: string, terminal: string): Promise<void> {
  await chooseMode("Apps")
  const start = $(`button[aria-label='Iniciar ${label}']`)
  await expect(start).toBeDisplayed()
  await start.click()

  const stop = $(`button[aria-label='Parar ${label}']`)
  try {
    await stop.waitForDisplayed({ timeout: 60_000 })
  } catch {
    await chooseMode("Terminal")
    const output = await $(".xterm-rows").getText().catch(() => "<sem saída>")
    throw new Error(`${label} did not become ready; terminal=${output}`)
  }

  await chooseMode("Terminal")
  expect((await terminalLabels()).filter((item) => item.startsWith(terminal))).toHaveLength(1)

  await chooseMode("Apps")
  await $(`button[aria-label='Parar ${label}']`).click()
  await $(`button[aria-label='Iniciar ${label}']`).waitForDisplayed({ timeout: 20_000 })

  await chooseMode("Terminal")
  await browser.waitUntil(
    async () => !(await terminalLabels()).some((item) => item.startsWith(terminal)),
    { timeout: 10_000 },
  )
}

describe("Matriz Control managed apps", () => {
  before(selectAcceptanceWorkspace)

  for (const app of apps) {
    it(`starts, owns, stops, and restarts ${app.label}`, async () => {
      await startAndStop(app.label, app.terminal)
      await startAndStop(app.label, app.terminal)
    })
  }
})
