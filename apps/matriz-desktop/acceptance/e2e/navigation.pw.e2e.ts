import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

const destinations = [
  ["Início", "main h1", "INÍCIO"],
  ["Portas", "main h1", "PORTAS"],
  ["Apps", "main h1", "APPS"],
  ["Workspace", "main h1", ".ENV MANAGER"],
  ["Hub", "main h1", "MATRIZ HUB"],
  ["Agentes", "main h1", "AGENTES"],
  ["Ambientes", "main h1", ".ENV MANAGER"],
  ["Infra", "main h1", "INFRA"],
  ["Git", "main h1", "GIT"],
  ["Terminal", "main section[aria-label='Terminal']", undefined],
  ["Ações", "main h1", "AÇÕES"],
  ["Store", "main h1", "MATRIZ STORE"],
  ["Doctor", "main h1", "DOCTOR"],
  ["Ajustes", "main h1", "AJUSTES"],
] as const

test("renders the Matriz identity and exposes every primary mode", async ({ tauriPage: page }) => {
  await expect(page.locator(".control-shell[data-matrizlib='0.1.0']")).toBeAttached()
  await expect(page.locator("header strong")).toHaveText("MATRIZ / CONTROL")
  await expect(page.locator("nav[aria-label='Modos'] > button")).toHaveCount(destinations.length)
  expect(await page.locator("nav[aria-label='Modos'] > button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")))).toEqual(destinations.map(([label]) => label))
})

test("navigates through the compact shell in one native window", async ({ tauriPage: page }) => {
  for (const [label, contentSelector, contentText] of destinations) {
    const destination = page.getByRole("button", { name: new RegExp(`^${label}`) })
    await destination.click()
    await expect(destination).toHaveAttribute("aria-current", "page")
    const content = page.locator(contentSelector)
    await expect(content).toBeVisible()
    if (contentText) await expect(content).toHaveText(contentText)
  }
  expect(page.context().pages()).toHaveLength(1)
})

test("opens the command deck with Ctrl K and restores focus", async ({ tauriPage: page }) => {
  await expect(page.locator("footer kbd")).toHaveText("Ctrl K")
  const origin = page.getByRole("button", { name: "Portas", exact: true })
  await origin.click()
  await page.keyboard.press("Control+K")
  const search = page.getByLabel("Buscar ações")
  await expect(search).toBeFocused()
  await search.fill("nova sessão powershell")
  await page.keyboard.press("Escape")
  await expect(origin).toBeFocused()
})

test("persists compact settings across navigation", async ({ tauriPage: page }) => {
  await chooseMode(page, "Ajustes")
  const sounds = page.locator(".settings-list label:nth-child(1) input")
  const volume = page.getByLabel("Volume")
  const originalSounds = await sounds.isChecked()

  await sounds.setChecked(!originalSounds)
  await expect(sounds).toBeChecked({ checked: !originalSounds })
  await volume.fill("0.65")
  await expect(sounds).toBeChecked({ checked: !originalSounds })
  await expect(volume).toHaveValue("0.65")
  await chooseMode(page, "Portas")
  await chooseMode(page, "Ajustes")
  expect(await sounds.isChecked()).toBe(!originalSounds)
  await expect(volume).toHaveValue("0.65")
})

test("keeps accessible navigation and catalog commands operational without sound", async ({ tauriPage: page }) => {
  await chooseMode(page, "Ajustes")
  const sounds = page.getByRole("checkbox", { name: "Sons" })
  await sounds.setChecked(false)
  await expect(sounds).not.toBeChecked()
  await chooseMode(page, "Portas")
  await expect(page.locator("main h1")).toHaveText("PORTAS")
  await expect(page.locator("footer [role='status']")).toHaveAttribute("aria-live", "polite")
  await expect(page.getByRole("button", { name: "Portas", exact: true })).toHaveAttribute("aria-current", "page")
  await chooseMode(page, "Ajustes")
  await expect(sounds).not.toBeChecked()

  await page.keyboard.press("Control+K")
  const search = page.getByLabel("Buscar ações")
  await search.fill("sessao powershell")
  const options = page.getByRole("option")
  await expect(options).toHaveCount(1)
  await expect(options.first()).toContainText("Nova sessão PowerShell")
  await search.press("ArrowDown")
  await expect(options.first()).toHaveAttribute("aria-selected", "true")

  await search.fill("powershell encodedcommand arbitrario")
  await expect(options).toHaveCount(0)
  await expect(page.getByText("00 / SEM AÇÃO")).toBeVisible()
  await search.press("Escape")

  await expect(invoke(page, "open_target", { targetId: "arbitrary-path" })).rejects.toThrow(/unknown|target/i)
  await expect(invoke(page, "start_managed_operation", { operationId: "shell.arbitrary" })).rejects.toThrow(/unknown|operation/i)
})

test("reports the real workspace, toolchain, and Git pulse", async ({ tauriPage: page }) => {
  await chooseMode(page, "Doctor")
  const checkRows = page.locator(".check-list > div")
  await expect(checkRows).toHaveCount(11)
  const checks = await checkRows.evaluateAll((rows) => rows.map((element) => ({
    id: element.querySelector(".doctor-check-name strong")?.textContent ?? "",
    text: element.textContent ?? "",
    ready: Boolean(element.querySelector(".status-dot.ready")),
  })))
  expect(checks.map(({ id }) => id)).toEqual([
    "Matriz Control", "Windows", "WebView2", "Workspace Matriz", "Node.js",
    "Corepack / pnpm", "Rust", "Git", "Terminal / ConPTY", "Matriz Workbench", "Codex App Server",
  ])
  if (!checks.every((check) => check.ready)) throw new Error(`Doctor degraded: ${JSON.stringify(checks)}`)
  expect(checks.map((check) => check.text).join(" ")).not.toMatch(/failed|timed out|não encontrado/i)

  await chooseMode(page, "Ações")
  await expect(page.locator("main .section-head")).toContainText("main")
})

test("observes the real Git workspace without mutating it", async ({ tauriPage: page }) => {
  await chooseMode(page, "Git")
  await expect(page.locator(".git-branch")).toContainText("main")
  await expect(page.locator(".git-branch")).not.toContainText("Verificando")
  await expect(page.getByRole("button", { name: "STAGE", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "UNSTAGE", exact: true })).toBeDisabled()
  await expect(page.locator(".git-change, .git-changes .area-note").first()).toBeVisible()
})

function invoke<T>(page: import("@playwright/test").Page, command: string, args?: Record<string, unknown>): Promise<T> {
  return page.evaluate(({ command, args }) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(name: string, input?: Record<string, unknown>): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(command, args), { command, args })
}
