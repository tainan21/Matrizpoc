import { _electron as electron, expect, test } from "@playwright/test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"

test("opens the real Electron shell with secure browser chrome", async () => {
  const profile = await mkdtemp(join(tmpdir(), "naevia-e2e-"))
  const application = await electron.launch({ args: ["."], cwd: process.cwd(), env: { ...process.env, NAEVIA_USER_DATA_DIR: profile } })
  try {
    await application.firstWindow()
    await expect.poll(() => application.windows().map((candidate) => candidate.url())).toContainEqual(expect.stringMatching(/\/dist\/index\.html$/))
    const window = application.windows().find((candidate) => /\/dist\/index\.html$/.test(candidate.url()))
    if (!window) throw new Error("Janela principal do NAEVIA não foi encontrada")
    await expect(window.getByLabel("NAEVIA")).toBeVisible()
    await expect(window.getByLabel("Pesquisar ou digitar endereço")).toHaveValue("https://duckduckgo.com/")
    await expect(window.getByRole("button", { name: "Nova aba", exact: true })).toBeVisible()
    const killSwitch = window.getByRole("button", { name: "Kill switch" })
    await killSwitch.click()
    await expect(killSwitch).toHaveClass(/danger/)
    await killSwitch.click()
    await expect(killSwitch).not.toHaveClass(/danger/)
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
  } finally {
    await application.close()
    if (dirname(profile) === tmpdir() && basename(profile).startsWith("naevia-e2e-")) await rm(profile, { recursive: true, force: true })
  }
})
