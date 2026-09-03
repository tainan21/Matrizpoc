import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { createServer } from "node:http"
import { DatabaseSync } from "node:sqlite"
import type { AddressInfo } from "node:net"
import type { BrowserSnapshot } from "../src/shared"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"

test("opens the real Electron shell with secure browser chrome", async () => {
  const profile = await mkdtemp(join(tmpdir(), "naevia-e2e-"))
  const legacyRoot = join(profile, "legacy")
  const legacyDatabase = join(legacyRoot, "runtime", "vault", "browser.sqlite")
  await mkdir(dirname(legacyDatabase), { recursive: true })
  const database = new DatabaseSync(legacyDatabase)
  database.exec("CREATE TABLE capsules (id TEXT PRIMARY KEY, name TEXT NOT NULL, policy TEXT NOT NULL); CREATE TABLE tabs (id TEXT PRIMARY KEY, capsule_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, active INTEGER NOT NULL);")
  database.prepare("INSERT INTO capsules VALUES (?, ?, ?)").run("legacy-capsule", "Exploração", "human")
  database.prepare("INSERT INTO tabs VALUES (?, ?, ?, ?, ?)").run("legacy-tab", "legacy-capsule", "Matriz", "https://example.com/", 1)
  database.close()
  const server = createServer((request, response) => {
    if (request.url === "/proof.txt") { response.setHeader("content-disposition", "attachment; filename=proof.txt"); response.end("download seguro") }
    else { response.setHeader("content-type", "text/html"); response.end('<a download href="/proof.txt">Baixar prova</a>') }
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const application = await launchNaevia({ ...process.env, NAEVIA_USER_DATA_DIR: profile, NAEVIA_DOWNLOAD_DIR: join(profile, "downloads"), NAEVIA_E2E: "1", NAEVIA_LEGACY_ROOT: legacyRoot })
  try {
    await application.firstWindow()
    await expect.poll(() => application.windows().map((candidate) => candidate.url())).toContainEqual(expect.stringMatching(/\/dist\/index\.html$/))
    const window = application.windows().find((candidate) => /\/dist\/index\.html$/.test(candidate.url()))
    if (!window) throw new Error("Janela principal do NAEVIA não foi encontrada")
    await expect(window.getByLabel("NAEVIA")).toBeVisible()
    await expect(window.getByLabel("Pesquisar ou digitar endereço")).toHaveValue("https://duckduckgo.com/")
    await expect(window.getByRole("button", { name: "Nova aba", exact: true })).toBeVisible()
    await window.getByRole("button", { name: "Importar legado" }).click()
    await expect(window.getByText("1 cápsulas · 1 abas")).toBeVisible()
    window.once("dialog", (dialog) => dialog.accept())
    await window.getByRole("button", { name: "Revisar e importar" }).click()
    await expect(window.getByRole("button", { name: "Exploração" })).toBeVisible()
    await expect(window.getByText("Backup disponível")).toBeVisible()
    window.once("dialog", (dialog) => dialog.accept())
    await window.getByRole("button", { name: "Restaurar perfil anterior" }).click()
    await expect(window.getByRole("button", { name: "Pessoal" })).toBeVisible()
    await window.getByRole("button", { name: "Fechar", exact: true }).click()
    const killSwitch = window.getByRole("button", { name: "Kill switch" })
    await killSwitch.click()
    await expect(killSwitch).toHaveClass(/danger/)
    await killSwitch.click()
    await expect(killSwitch).not.toHaveClass(/danger/)
    await window.getByLabel("Pesquisar ou digitar endereço").fill(origin)
    await window.getByLabel("Pesquisar ou digitar endereço").press("Enter")
    await expect.poll(() => application.windows().map((candidate) => candidate.url())).toContain(`${origin}/`)
    const content = application.windows().find((candidate) => candidate.url() === `${origin}/`)
    if (!content) throw new Error("Conteúdo remoto de teste não abriu")
    await content.getByRole("link", { name: "Baixar prova" }).click({ timeout: 10_000 })
    await window.getByRole("button", { name: "Downloads" }).click()
    await expect(window.getByText("proof.txt")).toBeVisible()
    await window.getByRole("button", { name: "Store" }).click()
    await expect(window.getByRole("heading", { name: "Matriz Store" })).toBeVisible()
    await window.getByRole("button", { name: "Terminal" }).click()
    await expect(window.getByText("Nenhuma sessão aberta.")).toBeVisible()
    await window.getByRole("button", { name: "Nova sessão PowerShell" }).click()
    await window.getByLabel("Entrada do terminal").fill("Write-Output 'NAEVIA-UNICODE-olá'")
    await window.getByRole("button", { name: "Enviar" }).click()
    await expect(window.locator(".terminal-session pre")).toContainText("NAEVIA-UNICODE-olá")
    await window.getByRole("button", { name: "Encerrar" }).click()
    await expect(window.getByText("Nenhuma sessão aberta.")).toBeVisible()

    await window.getByRole("button", { name: "Nova cápsula" }).click()
    await window.getByLabel("Nome").fill("Agentes")
    await window.getByLabel("Política").selectOption("agent-safe")
    await window.getByRole("button", { name: "Criar cápsula" }).click()
    await expect(window.getByRole("button", { name: "Agentes" })).toHaveClass(/active/)
    await window.getByRole("button", { name: "Nova aba", exact: true }).click()
    await expect(window.getByRole("tab")).toHaveCount(2)
    await window.locator(".tab-item.active .tab-close").click()
    await expect(window.getByRole("tab")).toHaveCount(1)

    const snapshot = await window.evaluate(() => globalThis.window.naevia.snapshot())
    const capsuleIds = snapshot.capsules.map(({ id }) => id)
    expect(capsuleIds).toHaveLength(2)
    const leaked = await application.evaluate(async ({ session }, ids) => {
      await session.fromPartition(`persist:naevia-${ids[0]}`).cookies.set({ url: "https://isolation.test", name: "proof", value: "private" })
      return session.fromPartition(`persist:naevia-${ids[1]}`).cookies.get({ url: "https://isolation.test", name: "proof" })
    }, capsuleIds)
    expect(leaked).toEqual([])
    const screenshotRoot = join(process.cwd(), "..", "..", "output", "naevia-acceptance")
    await mkdir(screenshotRoot, { recursive: true })
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setBounds({ width: 1440, height: 900 }))
    await window.screenshot({ path: join(screenshotRoot, "wide.png") })
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setBounds({ width: 900, height: 700 }))
    await window.screenshot({ path: join(screenshotRoot, "compact.png") })
  } finally {
    await application.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (dirname(profile) === tmpdir() && basename(profile).startsWith("naevia-e2e-")) await rm(profile, { recursive: true, force: true })
  }
})

test("preserves concurrent tab creation and restores every tab after restart", async () => {
  const profile = await mkdtemp(join(tmpdir(), "naevia-restart-"))
  try {
    const first = await launchNaevia({ ...process.env, NAEVIA_USER_DATA_DIR: profile })
    try {
      const firstWindow = await localWindow(first)
      await firstWindow.getByRole("button", { name: "Nova cápsula" }).click()
      await firstWindow.getByLabel("Nome").fill("Persistente")
      await firstWindow.getByLabel("Política").selectOption("agent-safe")
      await firstWindow.getByRole("button", { name: "Criar cápsula" }).click()
      await firstWindow.getByRole("button", { name: "Nova aba", exact: true }).click()
      await expect(firstWindow.getByRole("tab")).toHaveCount(2)
      await firstWindow.evaluate(async () => {
        const { activeCapsuleId } = await window.naevia.snapshot()
        await Promise.all(Array.from({ length: 3 }, () => window.naevia.createTab(activeCapsuleId)))
      })
      await expect(firstWindow.getByRole("tab")).toHaveCount(5)
      await firstWindow.evaluate(async () => {
        const { activeCapsuleId } = await window.naevia.snapshot()
        await Promise.all([window.naevia.createTab(activeCapsuleId), window.naevia.activateCapsule(activeCapsuleId)])
      })
      await expect(firstWindow.getByRole("tab")).toHaveCount(6)
    } finally { await first.close() }

    const second = await launchNaevia({ ...process.env, NAEVIA_USER_DATA_DIR: profile })
    try {
      const secondWindow = await localWindow(second)
      await expect(secondWindow.getByRole("button", { name: "Persistente" })).toHaveClass(/active/)
      await expect(secondWindow.getByRole("tab")).toHaveCount(6)
    } finally { await second.close() }
  } finally {
    if (dirname(profile) === tmpdir() && basename(profile).startsWith("naevia-restart-")) await rm(profile, { recursive: true, force: true })
  }
})

test("attaches a loading tab before the server responds and keeps it usable after stop", async () => {
  const profile = await mkdtemp(join(tmpdir(), "naevia-loading-"))
  let requestStarted = false
  const server = createServer((request, response) => {
    if (request.url === "/slow") { requestStarted = true; return }
    response.setHeader("content-type", "text/html")
    response.end('<button onclick="this.textContent=\'Clicked\'">Click me</button>')
  })
  let application: ElectronApplication | undefined
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const capsuleId = randomUUID()
    const tabId = randomUUID()
    await writeFile(join(profile, "browser-state.json"), JSON.stringify({ version: 1, snapshot: {
      capsules: [{ id: capsuleId, name: "Local", policy: "human" }],
      tabs: [{ id: tabId, capsuleId, title: "Slow", url: `${origin}/slow`, active: true, loading: false }],
      activeCapsuleId: capsuleId, activeTabId: tabId,
    } }))
    application = await launchNaevia({ ...process.env, NAEVIA_USER_DATA_DIR: profile })
    const window = await localWindow(application)
    await expect.poll(() => requestStarted).toBe(true)
    await expect.poll(() => application!.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].contentView.children.some((view) => {
        const bounds = view.getBounds()
        return view.getVisible() && bounds.width > 0 && bounds.height > 0
      })
    })).toBe(true)
    await window.getByRole("button", { name: "Parar", exact: true }).click()
    await window.getByLabel("Pesquisar ou digitar endereço").fill(origin)
    await window.getByLabel("Pesquisar ou digitar endereço").press("Enter")
    await expect.poll(() => application!.windows().map((page) => page.url())).toContain(`${origin}/`)
    const content = application.windows().find((page) => page.url() === `${origin}/`)!
    await content.getByRole("button", { name: "Click me" }).click()
    await expect(content.getByRole("button", { name: "Clicked" })).toBeVisible()
  } finally {
    if (application) await application.close()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (dirname(profile) === tmpdir() && basename(profile).startsWith("naevia-loading-")) await rm(profile, { recursive: true, force: true })
  }
})

for (const [phase, currentName] of [
  ["prepared", "Antes"], ["prepared", "Importado"], ["active", "Importado"],
  ["rollback_prepared", "Importado"], ["rollback_prepared", "Antes"],
] as const) {
  test(`recovers ${phase} with ${currentName} on disk only after explicit rollback`, async () => {
    const profile = await mkdtemp(join(tmpdir(), "naevia-recovery-"))
    const server = createServer((_request, response) => { response.setHeader("content-type", "text/html"); response.end("<title>Local</title><p>Recovery fixture</p>") })
    let application: ElectronApplication | undefined
    try {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
      const previous = recoverySnapshot("Antes", url)
      const current = currentName === "Antes" ? previous : recoverySnapshot("Importado", url)
      const backupPath = join(profile, "legacy-import", "backups", `${randomUUID()}.json`)
      await mkdir(dirname(backupPath), { recursive: true })
      await writeFile(backupPath, JSON.stringify({ version: 1, snapshot: previous }))
      await writeFile(join(profile, "browser-state.json"), JSON.stringify({ version: 1, snapshot: current }))
      await writeFile(join(profile, "legacy-import", "journal.json"), JSON.stringify({ version: 1, phase, importId: randomUUID(), importedAt: new Date().toISOString(), backupPath }))
      application = await launchNaevia({ ...process.env, NAEVIA_USER_DATA_DIR: profile })
      const window = await localWindow(application)
      await expect(window.getByRole("button", { name: currentName, exact: true })).toHaveClass(/active/)
      await expect.poll(() => window.evaluate(async () => (await globalThis.window.naevia.snapshot()).tabs.every((tab) => !tab.loading))).toBe(true)
      await window.getByRole("button", { name: "Importar legado" }).click()
      await expect(window.getByText("Backup disponível")).toBeVisible()
      window.once("dialog", (dialog) => dialog.accept())
      await window.getByRole("button", { name: "Restaurar perfil anterior" }).click()
      await expect.poll(() => window.evaluate(async () => ({
        canRollback: (await globalThis.window.naevia.legacyImportStatus()).canRollback,
        error: document.querySelector('[role="alert"]')?.textContent ?? "",
      }))).toEqual({ canRollback: false, error: "" })
      await expect(window.getByRole("button", { name: "Antes", exact: true })).toHaveClass(/active/)
      await application.close()
      application = await launchNaevia({ ...process.env, NAEVIA_USER_DATA_DIR: profile })
      const restarted = await localWindow(application)
      await expect(restarted.getByRole("button", { name: "Antes", exact: true })).toHaveClass(/active/)
      expect(await restarted.evaluate(async () => (await globalThis.window.naevia.legacyImportStatus()).canRollback)).toBe(false)
    } finally {
      if (application) await application.close()
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      if (dirname(profile) === tmpdir() && basename(profile).startsWith("naevia-recovery-")) await rm(profile, { recursive: true, force: true })
    }
  })
}

function recoverySnapshot(name: string, url: string): BrowserSnapshot {
  const capsuleId = randomUUID()
  const tabId = randomUUID()
  return { capsules: [{ id: capsuleId, name, policy: "human" }], tabs: [{ id: tabId, capsuleId, title: "Local", url, active: true, loading: false }], activeCapsuleId: capsuleId, activeTabId: tabId }
}

function launchNaevia(env: NodeJS.ProcessEnv): Promise<ElectronApplication> {
  const executablePath = process.env.NAEVIA_BINARY
  const definedEnvironment = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
  return electron.launch(executablePath ? { executablePath, env: definedEnvironment } : { args: ["."], cwd: process.cwd(), env: definedEnvironment })
}

async function localWindow(application: ElectronApplication) {
  await application.firstWindow()
  await expect.poll(() => application.windows().map((candidate) => candidate.url())).toContainEqual(expect.stringMatching(/\/dist\/index\.html$/))
  const window = application.windows().find((candidate) => /\/dist\/index\.html$/.test(candidate.url()))
  if (!window) throw new Error("Janela principal do NAEVIA não foi encontrada")
  return window
}
