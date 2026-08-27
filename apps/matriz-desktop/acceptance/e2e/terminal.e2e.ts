import { expect } from "@wdio/globals"
import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url))

const terminalOutput = () => $(".xterm-rows")
const terminalSurface = () => $(".xterm-screen")

async function openTerminal(): Promise<void> {
  await $("nav[aria-label='Modos'] button[aria-label^='Terminal']").click()
  await expect($("main section[aria-label='Terminal']")).toBeDisplayed()
}

async function createShell(): Promise<void> {
  await $("button[aria-label='Nova sessão PowerShell']").click()
  try {
    await browser.waitUntil(
      async () => (await $$("[role='tab'][aria-label*='executando']").length) > 0,
      { timeout: 10_000 },
    )
  } catch {
    const operationalMessage = await $("footer [role='status']").getText()
    throw new Error(`PowerShell session was not created: ${operationalMessage}`)
  }
  await expect(terminalSurface()).toBeDisplayed()
  await terminalSurface().click()
}

async function closeEveryShell(): Promise<void> {
  let count = await $$(".terminal-tabs [role='tab']").length
  while (count > 0) {
    await $("button[aria-label^='Fechar PowerShell']").click()
    try {
      await browser.waitUntil(
        async () => (await $$(".terminal-tabs [role='tab']").length) < count,
      )
    } catch {
      const tabs = await $$(".terminal-tabs [role='tab']")
      const labels: string[] = []
      const tabCount = await tabs.length
      for (let index = 0; index < tabCount; index += 1) {
        labels.push((await tabs[index]?.getAttribute("aria-label")) ?? "<missing>")
      }
      const operationalMessage = await $("footer [role='status']").getText()
      throw new Error(
        `Terminal close did not release a session: before=${count}; tabs=${labels.join(" | ")}; status=${operationalMessage}`,
      )
    }
    count = await $$(".terminal-tabs [role='tab']").length
  }
}

async function selectAcceptanceWorkspace(): Promise<void> {
  await $("nav[aria-label='Modos'] button[aria-label='Ajustes']").click()
  const workspace = $("input[aria-label='Workspace']")
  await expect(workspace).toBeDisplayed()
  await workspace.setValue(workspaceRoot)
  await $("button=USAR").click()
  await expect($("footer [role='status']")).toHaveText("Workspace pronto")
}

describe("Matriz Control PowerShell", () => {
  before(selectAcceptanceWorkspace)

  afterEach(async () => {
    await openTerminal()
    await closeEveryShell()
  })

  it("streams cwd and Unicode output, then remains interactive after Ctrl+C", async () => {
    const marker = `MATRIZ_ACCEPTANCE_${Date.now()}`
    await openTerminal()
    await createShell()

    expect(await $(":focus").getAttribute("class")).toContain("xterm-helper-textarea")
    await browser.keys([`Write-Output '${marker}'; Get-Location; Write-Output 'ação_✓'`, "Enter"])
    try {
      await browser.waitUntil(
        async () => (await terminalOutput().getText()).includes(marker),
        { timeout: 10_000 },
      )
    } catch {
      const output = await terminalOutput().getText()
      const tab = await $(".terminal-tabs [role='tab']").getAttribute("aria-label")
      throw new Error(`PowerShell marker did not reach xterm; tab=${tab}; output=${output}`)
    }
    await expect(terminalOutput()).toHaveText(expect.stringContaining("ação_✓"))
    await expect(terminalOutput()).toHaveText(expect.stringContaining("matriz-infra-hub"))

    await browser.keys(["while ($true) { Start-Sleep -Milliseconds 200 }", "Enter"])
    await $("button[aria-label^='Interromper PowerShell']").click()
    await terminalSurface().click()
    await browser.keys(["Write-Output 'INTERRUPT_OK'", "Enter"])
    await expect(terminalOutput()).toHaveText(expect.stringContaining("INTERRUPT_OK"))
  })

  it("enforces six tabs and releases every session through visible controls", async () => {
    await openTerminal()

    for (let index = 0; index < 6; index += 1) await createShell()

    await expect($("button[aria-label='Nova sessão PowerShell']")).toBeDisabled()
    expect(await $$(".terminal-tabs [role='tab']").length).toBe(6)

    await closeEveryShell()
    expect(await $$(".terminal-tabs [role='tab']").length).toBe(0)
    await expect($("button[aria-label='Nova sessão PowerShell']")).toBeEnabled()
  })
})
